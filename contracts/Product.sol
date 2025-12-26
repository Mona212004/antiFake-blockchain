// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract ProductIdentification {
    /*//////////////////////////////////////////////////////////////
                                STATE
    //////////////////////////////////////////////////////////////*/
    address public owner;
    uint256 public productCount;
    mapping(address => bool) public approvedManufacturers;
    mapping(string => bool) private usedSerials;

    struct Product {
        uint256 id;
        string serialNumber;
        string name;
        string brand;
        string description;
        string manufactDate;
        string imageUrl;
        address currentOwner;
        bool isSold;
        address[] history;
        string[] locationHistory;
        string[] actorNames;
        string[] timestampHistory;
        string manufacturerName;
        string manufacturerSig;
        address[] allowedRetailers;     // Now typically contains only 1 address
        string intendedRetailer;        // Human-readable retailer name (e.g. "Sorority Vintage NYC")
        string retailerSig;
    }

    mapping(uint256 => Product) public products;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/
    event ManufacturerApproved(address indexed manufacturer);
    event ProductCreated(
        uint256 indexed id,
        string indexed serial,
        address indexed manufacturer,
        string intendedRetailer
    );
    event ProductTransferred(uint256 indexed id, address indexed from, address indexed to);
    event ProductSold(uint256 indexed id);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/
    error Unauthorized();
    error ProductNotFound();
    error SerialAlreadyUsed();
    error ProductAlreadySold();

    /*//////////////////////////////////////////////////////////////
                                MODIFIERS
    //////////////////////////////////////////////////////////////*/
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyManufacturer() {
        if (!approvedManufacturers[msg.sender]) revert Unauthorized();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    constructor() {
        owner = msg.sender;
        // Optionally auto-approve deployer as manufacturer for easier local testing
        approvedManufacturers[msg.sender] = true;
    }

    /*//////////////////////////////////////////////////////////////
                        ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function approveManufacturer(address _manufacturer) external onlyOwner {
        approvedManufacturers[_manufacturer] = true;
        emit ManufacturerApproved(_manufacturer);
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL HELPERS
    //////////////////////////////////////////////////////////////*/
    function _contains(address[] memory arr, address value) internal pure returns (bool) {
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == value) return true;
        }
        return false;
    }

    /*//////////////////////////////////////////////////////////////
                        MANUFACTURER
    //////////////////////////////////////////////////////////////*/
    function addProduct(
        string memory _serial,
        string memory _name,
        string memory _brand,
        string memory _description,
        string memory _image,
        string memory _date,
        string memory _location,
        string memory _manufacturerSig,
        string memory _manufacturerName,
        address[] memory _allowedRetailers,     // Expected: single address or small list
        string memory _intendedRetailer         // Matches the retailer's display name
    ) external onlyManufacturer {
        if (usedSerials[_serial]) revert SerialAlreadyUsed();

        productCount++;
        usedSerials[_serial] = true;

        Product storage p = products[productCount];
        p.id = productCount;
        p.serialNumber = _serial;
        p.name = _name;
        p.brand = _brand;
        p.description = _description;
        p.imageUrl = _image;
        p.manufactDate = _date;
        p.currentOwner = msg.sender;
        p.manufacturerSig = _manufacturerSig;
        p.manufacturerName = _manufacturerName;
        p.allowedRetailers = _allowedRetailers;
        p.intendedRetailer = _intendedRetailer;

        // Initialize provenance history
        p.history.push(msg.sender);
        p.locationHistory.push(_location);
        p.actorNames.push(_manufacturerName);
        p.timestampHistory.push(_date);

        emit ProductCreated(productCount, _serial, msg.sender, _intendedRetailer);
    }

    /*//////////////////////////////////////////////////////////////
                        RETAILER
    //////////////////////////////////////////////////////////////*/
    function retailerReceive(
        uint256 _productId,
        string memory _location,
        string memory _retailerSig,
        string memory _retailerName,
        string memory _timestamp
    ) external {
        Product storage p = products[_productId];
        if (p.id == 0) revert ProductNotFound();
        if (!_contains(p.allowedRetailers, msg.sender)) revert Unauthorized();
        if (p.isSold) revert ProductAlreadySold();

        address oldOwner = p.currentOwner;
        p.currentOwner = msg.sender;
        p.retailerSig = _retailerSig;

        p.history.push(msg.sender);
        p.locationHistory.push(_location);
        p.actorNames.push(_retailerName);
        p.timestampHistory.push(_timestamp);

        emit ProductTransferred(_productId, oldOwner, msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                        CONSUMER
    //////////////////////////////////////////////////////////////*/
    function sellToConsumer(uint256 _productId) external {
        Product storage p = products[_productId];
        if (p.id == 0) revert ProductNotFound();
        if (p.currentOwner != msg.sender) revert Unauthorized();
        if (p.isSold) revert ProductAlreadySold();

        p.isSold = true;
        emit ProductSold(_productId);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW
    //////////////////////////////////////////////////////////////*/
    function getProductHistory(uint256 _productId)
        external
        view
        returns (
            address[] memory,
            string[] memory,
            string[] memory,
            string[] memory
        )
    {
        Product storage p = products[_productId];
        if (p.id == 0) revert ProductNotFound();
        return (
            p.history,
            p.locationHistory,
            p.actorNames,
            p.timestampHistory
        );
    }
}