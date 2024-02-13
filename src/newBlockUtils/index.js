const Block = require('../../models/block.model');
const { getMumbaiProvider } = require('../../utils/providers');

const newBlockHandler = async (
  blockNumber,
  provider = getMumbaiProvider(),
  actions = async () => {},
) => {
  try {
    const newBlock = new Block({ blockNumber });
    const blockDataWithTransactions = await provider.getBlockWithTransactions(
      blockNumber,
    );
    await actions(blockDataWithTransactions);
    newBlock.hash = blockDataWithTransactions.hash;
    newBlock.parentHash = blockDataWithTransactions.parentHash;
    newBlock.timestamp = new Date(blockDataWithTransactions.timestamp * 1e3);
    newBlock.chainId = provider.network.chainId;
    newBlock.save();
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  newBlockHandler,
};
