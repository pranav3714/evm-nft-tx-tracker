const { providers } = require("ethers");

const getProvider = (rpcIndex = 1) => {
  const provider = new providers.JsonRpcProvider(
    rpcIndex === 1 ? process.env.RPC_URL : process.env.RPC2_URL
  );
  return provider;
};

module.exports = {
  getProvider,
};
