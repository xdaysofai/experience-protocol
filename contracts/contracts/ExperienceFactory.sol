// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Experience} from "./Experience.sol";

contract ExperienceFactory is Ownable2Step {
    address public immutable PLATFORM_WALLET;
    uint16  public immutable PLATFORM_FEE_BPS;

    event ExperienceCreated(address indexed creator, address experience, string cidInitial, address flowSyncAuthority, uint16 proposerFeeBps);

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
        uint16 proposerFeeBps // default 1000 suggested; can be overridden post-deploy
    ) external returns (address experience) {
        Experience exp = new Experience(
            creator,
            cidInitial,
            flowSyncAuthority,
            PLATFORM_WALLET,
            PLATFORM_FEE_BPS
        );
        if (proposerFeeBps != 1000) {
            // optional tuning immediately by creator via flowSync/owner call
            // leave default; UI can change with setProposerFeeBps
        }
        emit ExperienceCreated(creator, address(exp), cidInitial, flowSyncAuthority, proposerFeeBps);
        return address(exp);
    }
}
