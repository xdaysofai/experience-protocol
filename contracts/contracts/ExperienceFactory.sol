// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Experience} from "./Experience.sol";

interface IExperienceRegistry {
    function registerExperience(address _experience, address _creator, string calldata _cid) external;
}

contract ExperienceFactory is Ownable2Step {
    address public immutable PLATFORM_WALLET;
    uint16  public immutable PLATFORM_FEE_BPS;
    address public registry;

    event ExperienceCreated(address indexed creator, address experience, string cidInitial);

    constructor(address platformWallet, uint16 platformFeeBps) Ownable(msg.sender) {
        require(platformWallet != address(0), "platform=0");
        require(platformFeeBps <= 10_000, "fee>100%");
        PLATFORM_WALLET = platformWallet;
        PLATFORM_FEE_BPS = platformFeeBps;
    }

    function createExperience(
        address creator,
        string calldata cidInitial,
        address flowSyncAuthority,
        uint16 proposerFeeBps // default 1000 suggested
    ) external returns (address experience) {
        // Use default 1000 if 0 provided
        uint16 actualProposerFeeBps = proposerFeeBps == 0 ? 1000 : proposerFeeBps;
        
        Experience exp = new Experience(
            creator,
            cidInitial,
            flowSyncAuthority,
            PLATFORM_WALLET,
            PLATFORM_FEE_BPS,
            actualProposerFeeBps,
            registry
        );
        
        // Register with registry if available
        if (registry != address(0)) {
            try IExperienceRegistry(registry).registerExperience(address(exp), creator, cidInitial) {
                // Registration succeeded
            } catch {
                // Registration failed, but continue (don't revert the deployment)
            }
        }
        
        emit ExperienceCreated(creator, address(exp), cidInitial);
        return address(exp);
    }

    /**
     * @dev Set the registry contract address (only owner)
     */
    function setRegistry(address _registry) external onlyOwner {
        registry = _registry;
    }
}