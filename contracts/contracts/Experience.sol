// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IExperienceRegistry {
    function recordPurchase(address _purchaser, uint256 _quantity) external;
}

/**
 * Experience: ETH-only token-gated access sold in ERC-1155 "passes" (SBT, id=1).
 * Payments split: platform (immutable BPS), optional current proposer (state BPS), remainder to creator.
 */
contract Experience is ERC1155, Ownable2Step, ReentrancyGuard {

    // ---- Constants / immutables ----
    uint256 public constant PASS_ID = 1;
    address public immutable PLATFORM_WALLET;
    uint16  public immutable PLATFORM_FEE_BPS; // e.g., 500 = 5%
    address public immutable REGISTRY;

    // ---- Roles / addresses ----
    address public creator;
    address public flowSyncAuthority; // allowed to set proposer + cid

    // ---- Proposer fee ----
    address public currentProposer;         // address(0) => no proposer share
    uint16  public proposerFeeBps;          // default 1000 (=10%)

    // ---- Content ----
    string private _cid;

    // ---- Pricing ----
    uint256 public priceEthWei; // 0 means disabled

    // ---- Events ----
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    event Bought(address indexed buyer, uint256 qty, uint256 paid);
    event ProposerUpdated(address indexed proposer);
    event CidUpdated(string cid);

    // ---- Errors ----
    error InvalidPrice();
    error InvalidQuantity();
    error NotFlowSyncAuthority();
    error TransfersDisabled();
    error ZeroAddress();
    error InsufficientPayment();
    error PaymentFailed();

    modifier onlyFlowSyncAuthority() {
        if (msg.sender != flowSyncAuthority) revert NotFlowSyncAuthority();
        _;
    }

    constructor(
        address _creator,
        string memory cidInitial,
        address _flowSyncAuthority,
        address _platformWallet,
        uint16 _platformFeeBps,
        uint16 _proposerFeeBps,
        address _registry
    ) ERC1155("") Ownable(_creator) {
        if (_creator == address(0) || _platformWallet == address(0)) revert ZeroAddress();
        creator = _creator;
        flowSyncAuthority = _flowSyncAuthority;
        PLATFORM_WALLET = _platformWallet;
        PLATFORM_FEE_BPS = _platformFeeBps;
        REGISTRY = _registry;
        proposerFeeBps = _proposerFeeBps;
        _cid = cidInitial;
        priceEthWei = 0; // disabled initially
    }

    // --- Owner (creator) controls price ---
    function setPriceEthWei(uint256 _priceEthWei) external onlyOwner {
        uint256 oldPrice = priceEthWei;
        priceEthWei = _priceEthWei;
        emit PriceUpdated(oldPrice, _priceEthWei);
    }

    // --- Buy flow ---
    function buyWithEth(uint256 qty) external payable nonReentrant {
        if (qty == 0) revert InvalidQuantity();
        if (priceEthWei == 0) revert InvalidPrice();
        
        uint256 paid = priceEthWei * qty;
        if (msg.value != paid) revert InsufficientPayment();

        // Calculate splits
        uint256 platform = (paid * PLATFORM_FEE_BPS) / 10_000;
        uint256 proposer = (currentProposer == address(0)) ? 0 : (paid * proposerFeeBps) / 10_000;
        uint256 creatorAmount = paid - platform - proposer;

        // Payout via call checks (no reverts swallowed)
        if (platform > 0) {
            (bool success, ) = PLATFORM_WALLET.call{value: platform}("");
            if (!success) revert PaymentFailed();
        }
        if (proposer > 0) {
            (bool success, ) = currentProposer.call{value: proposer}("");
            if (!success) revert PaymentFailed();
        }
        if (creatorAmount > 0) {
            (bool success, ) = creator.call{value: creatorAmount}("");
            if (!success) revert PaymentFailed();
        }

        // Mint SBT
        _mint(msg.sender, PASS_ID, qty, "");

        // Record purchase in registry (if registry is set)
        if (REGISTRY != address(0)) {
            try IExperienceRegistry(REGISTRY).recordPurchase(msg.sender, qty) {
                // Registry call succeeded
            } catch {
                // Registry call failed, but continue (don't revert the purchase)
            }
        }

        emit Bought(msg.sender, qty, paid);
    }

    // --- Flow sync authority updates ---
    function setCurrentProposer(address proposer) external onlyFlowSyncAuthority {
        currentProposer = proposer;
        emit ProposerUpdated(proposer);
    }

    function setCid(string calldata newCid) external onlyFlowSyncAuthority {
        _cid = newCid;
        emit CidUpdated(newCid);
    }

    function cid() external view returns (string memory) {
        return _cid;
    }

    // --- (Optional) admin may rotate flowSyncAuthority if needed ---
    function setFlowSyncAuthority(address a) external onlyOwner {
        if (a == address(0)) revert ZeroAddress();
        flowSyncAuthority = a;
    }

    function setProposerFeeBps(uint16 bps) external onlyOwner {
        require(bps <= 10_000, "bps>100%");
        proposerFeeBps = bps;
    }

    // ---- SBT enforcement: override transfer hooks to revert ----
    function safeTransferFrom(address, address, uint256, uint256, bytes memory) public virtual override {
        revert TransfersDisabled();
    }

    function safeBatchTransferFrom(address, address, uint256[] memory, uint256[] memory, bytes memory) public virtual override {
        revert TransfersDisabled();
    }

    function setApprovalForAll(address, bool) public virtual override {
        revert TransfersDisabled();
    }

    // Allow contract to receive ETH
    receive() external payable {}
}