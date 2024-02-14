const erc721 = require('../abis/erc721');
const erc1155 = require('../abis/erc1155');
const getRedisClient = require('../utils/redis');
const { Interface } = require('ethers/lib/utils');
const { newBlockHandler } = require('./newBlockUtils');
const { getMumbaiProvider } = require('../utils/providers');
const { validTopics, NftEvent } = require('../models/nft-events.model');
const { contractRecorder } = require('./newBlockUtils/nftContractListener');

const mumbaiProvider = getMumbaiProvider();
const mumbaiProvider2 = getMumbaiProvider(2);
const iface = new Interface([...erc1155, ...erc721]);

mumbaiProvider.on(
  {
    topics: [],
  },
  async (log) => {
    const {
      address, data, topics, transactionHash,
    } = log;
    const rClient = await getRedisClient();
    const knownContract = await rClient.get(address);
    const validTopicSigs = Object.values(validTopics);
    if (knownContract) {
      if (topics.includes(validTopicSigs[0])) {
        console.log('its TransferSingle');
        const transferInfo = iface.decodeEventLog(
          'TransferSingle',
          data,
          topics,
        );
        new NftEvent({
          amount: transferInfo.value.toString(),
          contractAddress: address,
          from: transferInfo.from,
          to: transferInfo.to,
          tokenId: transferInfo.id.toString(),
          type: 'TransferSingle',
          txHash: transactionHash,
          chainId: mumbaiProvider.network.chainId,
        }).save();
      } else if (topics.includes(validTopicSigs[1])) {
        console.log('its TransferBatch');
        const batchTransferInfo = iface.decodeEventLog(
          'TransferBatch',
          data,
          topics,
        );
        const additionalData = {
          contractAddress: address,
          from: batchTransferInfo.from,
          to: batchTransferInfo.to,
          type: 'TransferBatch',
          txHash: transactionHash,
        };
        const tokens = batchTransferInfo.ids.map((id, index) => ({
          tokenId: id,
          amount: batchTransferInfo[4][index],
          chainId: mumbaiProvider.network.chainId,
          ...additionalData,
        }));
        NftEvent.insertMany(tokens);
      } else if (topics.includes(validTopicSigs[2])) {
        console.log('its URI');
        const uriEvent = iface.decodeEventLog('URI', data, topics);
        new NftEvent({
          contractAddress: address,
          txHash: transactionHash,
          tokenId: uriEvent.id.toString(),
          type: 'URI',
          uri: uriEvent.value,
          chainId: mumbaiProvider.network.chainId,
        }).save();
      } else if (topics.includes(validTopicSigs[3])) {
        console.log('its Transfer');
        const transfer721 = iface.decodeEventLog('Transfer', data, topics);
        new NftEvent({
          contractAddress: address,
          txHash: transactionHash,
          from: transfer721.from,
          to: transfer721.to,
          tokenId: transfer721.tokenId.toString(),
          type: 'Transfer',
          chainId: mumbaiProvider.network.chainId,
        }).save();
      }
    }
  },
);
mumbaiProvider2.on('block', async (blockNumber) => {
  newBlockHandler(
    blockNumber,
    mumbaiProvider2,
    async (blockDataWithTransactions) => {
      await contractRecorder(blockDataWithTransactions, mumbaiProvider2);
    },
  );
});
