// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Experience.sol";

/**
 * @title ExperienceRegistry
 * @dev Global registry for tracking Experience contracts and their relationships
 */
contract ExperienceRegistry {
    
    // Events
    event ExperienceRegistered(
        address indexed experience,
        address indexed creator,
        string cid,
        uint256 indexed timestamp
    );
    
    event PurchaseRecorded(
        address indexed experience,
        address indexed purchaser,
        uint256 quantity,
        uint256 indexed timestamp
    );
    
    // Structs
    struct ExperienceInfo {
        address experience;
        address creator;
        string cid;
        uint256 createdAt;
        bool active;
    }
    
    struct PurchaseInfo {
        address experience;
        address purchaser;
        uint256 totalQuantity;
        uint256 firstPurchaseAt;
        uint256 lastPurchaseAt;
    }
    
    // Storage
    mapping(address => ExperienceInfo) public experiences; // experience address -> info
    mapping(address => address[]) public creatorExperiences; // creator -> experience addresses
    mapping(address => address[]) public purchaserExperiences; // purchaser -> experience addresses
    mapping(bytes32 => PurchaseInfo) public purchases; // keccak256(experience, purchaser) -> info
    
    // Arrays for enumeration
    address[] public allExperiences;
    
    // Access control
    mapping(address => bool) public authorizedFactories;
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyAuthorized() {
        require(authorizedFactories[msg.sender] || msg.sender == owner, "Not authorized");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Register a new Experience contract
     * Called by authorized factories when creating experiences
     */
    function registerExperience(
        address _experience,
        address _creator,
        string calldata _cid
    ) external onlyAuthorized {
        require(_experience != address(0), "Invalid experience address");
        require(_creator != address(0), "Invalid creator address");
        require(!experiences[_experience].active, "Experience already registered");
        
        // Store experience info
        experiences[_experience] = ExperienceInfo({
            experience: _experience,
            creator: _creator,
            cid: _cid,
            createdAt: block.timestamp,
            active: true
        });
        
        // Add to creator's list
        creatorExperiences[_creator].push(_experience);
        
        // Add to global list
        allExperiences.push(_experience);
        
        emit ExperienceRegistered(_experience, _creator, _cid, block.timestamp);
    }
    
    /**
     * @dev Record a purchase
     * Called by Experience contracts when passes are purchased
     */
    function recordPurchase(
        address _purchaser,
        uint256 _quantity
    ) external {
        require(experiences[msg.sender].active, "Experience not registered");
        require(_purchaser != address(0), "Invalid purchaser");
        require(_quantity > 0, "Invalid quantity");
        
        bytes32 purchaseKey = keccak256(abi.encodePacked(msg.sender, _purchaser));
        
        // Check if this is first purchase from this user for this experience
        if (purchases[purchaseKey].purchaser == address(0)) {
            // First purchase - add to purchaser's list
            purchaserExperiences[_purchaser].push(msg.sender);
            
            purchases[purchaseKey] = PurchaseInfo({
                experience: msg.sender,
                purchaser: _purchaser,
                totalQuantity: _quantity,
                firstPurchaseAt: block.timestamp,
                lastPurchaseAt: block.timestamp
            });
        } else {
            // Additional purchase - update existing record
            purchases[purchaseKey].totalQuantity += _quantity;
            purchases[purchaseKey].lastPurchaseAt = block.timestamp;
        }
        
        emit PurchaseRecorded(msg.sender, _purchaser, _quantity, block.timestamp);
    }
    
    /**
     * @dev Get all experiences created by a wallet
     */
    function getCreatedExperiences(address _creator) 
        external 
        view 
        returns (address[] memory) 
    {
        return creatorExperiences[_creator];
    }
    
    /**
     * @dev Get all experiences purchased by a wallet
     */
    function getPurchasedExperiences(address _purchaser) 
        external 
        view 
        returns (address[] memory) 
    {
        return purchaserExperiences[_purchaser];
    }
    
    /**
     * @dev Get experience info
     */
    function getExperienceInfo(address _experience) 
        external 
        view 
        returns (ExperienceInfo memory) 
    {
        require(experiences[_experience].active, "Experience not found");
        return experiences[_experience];
    }
    
    /**
     * @dev Get purchase info for a specific experience-purchaser pair
     */
    function getPurchaseInfo(address _experience, address _purchaser) 
        external 
        view 
        returns (PurchaseInfo memory) 
    {
        bytes32 purchaseKey = keccak256(abi.encodePacked(_experience, _purchaser));
        return purchases[purchaseKey];
    }
    
    /**
     * @dev Get total number of experiences created
     */
    function getTotalExperiences() external view returns (uint256) {
        return allExperiences.length;
    }
    
    /**
     * @dev Get all experience addresses (paginated)
     */
    function getAllExperiences(uint256 _offset, uint256 _limit) 
        external 
        view 
        returns (address[] memory) 
    {
        require(_offset < allExperiences.length, "Offset out of bounds");
        
        uint256 end = _offset + _limit;
        if (end > allExperiences.length) {
            end = allExperiences.length;
        }
        
        address[] memory result = new address[](end - _offset);
        for (uint256 i = 0; i < result.length; i++) {
            result[i] = allExperiences[_offset + i];
        }
        
        return result;
    }
    
    /**
     * @dev Get count of experiences created by a wallet
     */
    function getCreatedExperiencesCount(address _creator) 
        external 
        view 
        returns (uint256) 
    {
        return creatorExperiences[_creator].length;
    }
    
    /**
     * @dev Get count of experiences purchased by a wallet
     */
    function getPurchasedExperiencesCount(address _purchaser) 
        external 
        view 
        returns (uint256) 
    {
        return purchaserExperiences[_purchaser].length;
    }
    
    /**
     * @dev Admin: Authorize a factory to register experiences
     */
    function authorizeFactory(address _factory) external onlyOwner {
        authorizedFactories[_factory] = true;
    }
    
    /**
     * @dev Admin: Revoke factory authorization
     */
    function revokeFactory(address _factory) external onlyOwner {
        authorizedFactories[_factory] = false;
    }
    
    /**
     * @dev Admin: Update experience info (in case of CID updates)
     */
    function updateExperienceCid(address _experience, string calldata _newCid) 
        external 
        onlyOwner 
    {
        require(experiences[_experience].active, "Experience not found");
        experiences[_experience].cid = _newCid;
    }
    
    /**
     * @dev Check if an experience is registered
     */
    function isExperienceRegistered(address _experience) 
        external 
        view 
        returns (bool) 
    {
        return experiences[_experience].active;
    }
    
    /**
     * @dev Check if a wallet has purchased from a specific experience
     */
    function hasPurchased(address _experience, address _purchaser) 
        external 
        view 
        returns (bool) 
    {
        bytes32 purchaseKey = keccak256(abi.encodePacked(_experience, _purchaser));
        return purchases[purchaseKey].purchaser != address(0);
    }
}
