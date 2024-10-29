// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import { VRFConsumerBaseV2Plus } from '@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol';
import { VRFV2PlusClient } from '@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

error RandomIpfsNft__RangeOutofBounds();
error RandomIpfsNft__NeedMoreEth();
error RandomIpfsNft__TransferFailed();

contract RandomIpfsNft is VRFConsumerBaseV2Plus, ERC721URIStorage {
    // when we min a NFT, 我们会触发一个 chainlink VRF 获得一个 random number
    // 我们使用这个随机数来获得一个随机的 NFT

    /**
     * @dev 狗的品种
     */
    enum Breed {
        PUB, SHIBA_INU, ST_BERNARD
    }

    event NftRequested(uint256 indexed requestId, address requester);
    event NftMinted(Breed dogBreed, address minter);

    mapping(uint256 => address) s_rquestIdToSender;

    uint256 public s_tokenCounter;
    string[] internal s_dogTokenUris;
    uint256 internal constant c_minFee = 0;


    bytes32 private immutable i_gasLane;
    uint256 private immutable i_subId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_COMFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    /**
     * @dev true 则 chainlink VRF 在 fulfillRandomWords 时使用 LINK 来扣费，false 则使用 ETH 扣费
     */
    bool private immutable i_nativePayment;

    constructor(
        address vrfCoordinatorAddr,
        bytes32 gasLane,
        uint256 subId,
        uint32 callbackGasLimit,
        bool nativePayment,
        string[3] memory dogTokenUris
    ) VRFConsumerBaseV2Plus(vrfCoordinatorAddr) ERC721('Dogie', 'Dog') {
        i_gasLane = gasLane;
        i_subId = subId;
        i_callbackGasLimit = callbackGasLimit;
        i_nativePayment = nativePayment;
        s_dogTokenUris = dogTokenUris;
    }

    function requestNft() public payable returns (uint256) {
        if (msg.value < c_minFee) {
            revert RandomIpfsNft__NeedMoreEth();
        }
        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: i_gasLane,
                subId: i_subId,
                requestConfirmations: REQUEST_COMFIRMATIONS,
                callbackGasLimit: i_callbackGasLimit,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({ nativePayment: i_nativePayment }))
            })
        );
        s_rquestIdToSender[requestId] = msg.sender;
        emit NftRequested(requestId, msg.sender);
        return requestId;
    }

    function withdraw() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success,) = msg.sender.call{value: amount}("");
        if (!success) {
            revert RandomIpfsNft__TransferFailed();
        }
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        address dogOwner = s_rquestIdToSender[requestId];
        uint256 newTokenId = s_tokenCounter;
        s_tokenCounter++;
        
        uint256 idx = randomWords[0] % 100;
        /**
         * 如果 idx < 10，则是哈巴狗
         * 如果 idx >= 10 && idx < 30，则是塞巴英努犬
         * 如果 idx >= 30，则是圣伯纳犬
         */
        Breed dogBreed = getBreedFromModdedRng(idx);
        _safeMint(dogOwner, newTokenId);
        _setTokenURI(newTokenId, s_dogTokenUris[uint256(dogBreed)]);
        emit NftMinted(dogBreed, dogOwner);
    }

    function getBreedFromModdedRng(uint256 idx) public pure returns(Breed) {
        /**
         * index 0 有 10% 的几率
         * index 1 有 20% 的几率
         * index 2 有 70% 的几率
         */
        uint8[3] memory thresholds = [10, 30, 100];
        for (uint256 i = 0; i < thresholds.length; i++) {
            if (idx < thresholds[i]) {
                return Breed(i);
            }
        }
        revert RandomIpfsNft__RangeOutofBounds();
    }

    function getMinFee() public pure returns(uint256) {
        return c_minFee;
    }

    function getDogTokenUris(uint256 idx) public view returns(string memory) {
        return s_dogTokenUris[idx];
    }

    function getTokenCounter() public view returns(uint256) {
        return s_tokenCounter;
    }
}
