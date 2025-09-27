// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * Experience: token-gated access sold in ERC-1155 "passes" (SBT, id=1).
 * Payments split: platform (immutable BPS), optional current proposer (state BPS), remainder to creator.
 * Token allowlist & per-token price (in token decimals).
 */
contract Experience is ERC1155, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---- Constants / immutables ----
    uint256 public constant PASS_ID = 1;
    address public immutable PLATFORM_WALLET;
    uint16  public immutable PLATFORM_FEE_BPS; // e.g., 500 = 5%

    // ---- Roles / addresses ----
    address public creator;
    address public flowSyncAuthority; // allowed to set proposer + cid

    // ---- Proposer fee ----
    address public currentProposer;         // address(0) => no proposer share
    uint16  public proposerFeeBps;          // default 1000 (=10%)

    // ---- Content ----
    string private _cid;

    // ---- Pricing / Allowlist ----
    mapping(address => bool) public allowedToken;
    mapping(address => uint256) public priceByToken; // in token decimals

    // ---- Events ----
    event TokenAllowed(address indexed token, bool allowed, uint256 price);
    event Bought(address indexed buyer, address indexed token, uint256 qty, uint256 paid);
    event CurrentProposerSet(address indexed proposer);
    event CidUpdated(string cid);

    // ---- Errors ----
    error NotAllowedToken();
    error InvalidPrice();
    error InvalidQuantity();
    error NotFlowSyncAuthority();
    error TransfersDisabled();
    error ZeroAddress();

    modifier onlyFlowSyncAuthority() {
        if (msg.sender != flowSyncAuthority) revert NotFlowSyncAuthority();
        _;
    }

    constructor(
        address _creator,
        string memory cidInitial,
        address _flowSyncAuthority,
        address _platformWallet,
        uint16 _platformFeeBps
    ) ERC1155("") Ownable(_creator) {
        if (_creator == address(0) || _platformWallet == address(0)) revert ZeroAddress();
        creator = _creator;
        flowSyncAuthority = _flowSyncAuthority;
        PLATFORM_WALLET = _platformWallet;
        PLATFORM_FEE_BPS = _platformFeeBps;
        proposerFeeBps = 1000; // 10%
        _cid = cidInitial;
    }

    // --- Owner (creator) controls prices/allowlist ---
    function setTokenPrice(address token, uint256 priceInUnits, bool allowed) external onlyOwner {
        priceByToken[token] = priceInUnits;
        allowedToken[token] = allowed;
        emit TokenAllowed(token, allowed, priceInUnits);
    }

    function setTokenAllowed(address token, bool allowed) external onlyOwner {
        allowedToken[token] = allowed;
        emit TokenAllowed(token, allowed, priceByToken[token]);
    }

    // --- Buy flow ---
    function buyWithToken(address token, uint256 quantity) external nonReentrant {
        if (!allowedToken[token]) revert NotAllowedToken();
        uint256 unitPrice = priceByToken[token];
        if (unitPrice == 0) revert InvalidPrice();
        if (quantity == 0) revert InvalidQuantity();

        uint256 cost = unitPrice * quantity;

        // pull funds
        IERC20(token).safeTransferFrom(msg.sender, address(this), cost);

        // split
        uint256 platformAmt = (cost * PLATFORM_FEE_BPS) / 10_000;
        uint256 proposerAmt = currentProposer == address(0) ? 0 : (cost * proposerFeeBps) / 10_000;
        uint256 creatorAmt = cost - platformAmt - proposerAmt;

        if (platformAmt > 0) IERC20(token).safeTransfer(PLATFORM_WALLET, platformAmt);
        if (proposerAmt > 0) IERC20(token).safeTransfer(currentProposer, proposerAmt);
        if (creatorAmt > 0) IERC20(token).safeTransfer(creator, creatorAmt);

        _mintPass(msg.sender, quantity);
        emit Bought(msg.sender, token, quantity, cost);
    }

    // --- Flow sync authority updates ---
    function setCurrentProposer(address proposer) external onlyFlowSyncAuthority {
        currentProposer = proposer;
        emit CurrentProposerSet(proposer);
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

    // ---- Soulbound ERC-1155 implementation ----
    function _mintPass(address to, uint256 qty) internal {
        _mint(to, PASS_ID, qty, "");
    }

    // Block transfers except mint/burn
    function safeTransferFrom(address, address, uint256, uint256, bytes memory) public virtual override {
        revert TransfersDisabled();
    }

    function safeBatchTransferFrom(address, address, uint256[] memory, uint256[] memory, bytes memory) public virtual override {
        revert TransfersDisabled();
    }

    function setApprovalForAll(address, bool) public virtual override {
        revert TransfersDisabled();
    }
}
