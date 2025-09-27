// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ExperienceETH} from "./ExperienceETH.sol";

contract ExperienceFactoryETH is Ownable2Step {
    address public immutable PLATFORM_WALLET;
    uint16  public immutable PLATFORM_FEE_BPS;

    event ExperienceCreated(
        address indexed creator, 
        address experience, 
        string cidInitial, 
        address flowSyncAuthority, 
        uint16 proposerFeeBps,
        uint256 pricePerPass
    );

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
        uint16 proposerFeeBps, // default 1000 suggested
        uint256 pricePerPass   // price in wei (e.g., 0.01 ETH = 10000000000000000)
    ) external returns (address experience) {
        ExperienceETH exp = new ExperienceETH(
            creator,
            cidInitial,
            flowSyncAuthority,
            PLATFORM_WALLET,
            PLATFORM_FEE_BPS,
            pricePerPass
        );
        
        emit ExperienceCreated(
            creator, 
            address(exp), 
            cidInitial, 
            flowSyncAuthority, 
            proposerFeeBps,
            pricePerPass
        );
        return address(exp);
    }
}
