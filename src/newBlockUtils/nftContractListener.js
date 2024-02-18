const { Multicall } = require('ethereum-multicall');
const erc721 = require('../../abis/erc721');
const erc1155 = require('../../abis/erc1155');
const supportsInterface = require('../../abis/supportsInterface');
const {
  NftContract,
  contractTypes,
} = require('../../models/nft-contract.model');
const getRedisClient = require('../../utils/redis');
const common = require('../../abis/common');

const checkContractType = async (cTxn, provider) => {
  const {
    from, hash, blockNumber, chainId,
  } = cTxn;
  const contractAddress = cTxn.creates;
  try {
    const multicall = new Multicall({
      ethersProvider: provider,
      tryAggregate: true,
    });
    const results = await multicall.call({
      reference: 'contract',
      contractAddress,
      abi: [...supportsInterface, ...erc721, ...erc1155, ...common],
      calls: [
        {
          reference: 'supportsInterfaceERC1155',
          methodName: 'supportsInterface',
          methodParameters: ['0xd9b67a26'],
        },
        {
          reference: 'supportsInterfaceERC721',
          methodName: 'supportsInterface',
          methodParameters: ['0x80ac58cd'],
        },
        {
          reference: 'name',
          methodName: 'name',
          methodParameters: [],
        },
        {
          reference: 'symbol',
          methodName: 'symbol',
          methodParameters: [],
        },
        // {
        //   reference: 'totalSupply',
        //   methodName: 'totalSupply',
        //   methodParameters: [],
        // },
        {
          reference: 'baseURI',
          methodName: 'baseURI',
          methodParameters: [],
        },
        // {
        //   reference: 'contractURI',
        //   methodName: 'contractURI',
        //   methodParameters: [],
        // },
      ],
    });
    const returnContext = results.results.contract.callsReturnContext;
    return {
      contractAddress,
      isERC1155:
        returnContext.find(
          ({ reference }) => reference === 'supportsInterfaceERC1155',
        ).returnValues[0] || false,
      isERC721:
        returnContext.find(
          ({ reference }) => reference === 'supportsInterfaceERC721',
        ).returnValues[0] || false,
      name: returnContext.find(({ reference }) => reference === 'name')
        .returnValues[0],
      symbol: returnContext.find(({ reference }) => reference === 'symbol')
        .returnValues[0],
      // supply: returnContext.find(({ reference }) => reference === 'totalSupply')
      //   .returnValues[0]?.hex
      //   ? BigNumber.from(
      //     returnContext.find(({ reference }) => reference === 'totalSupply')
      //       .returnValues[0]?.hex,
      //   ).toString()
      //   : undefined,
      baseURI: returnContext.find(({ reference }) => reference === 'baseURI')
        .returnValues[0],
      // contractURI: returnContext.find(
      //   ({ reference }) => reference === 'contractURI',
      // ).returnValues[0],
      from,
      hash,
      blockNumber,
      chainId,
    };
  } catch (error) {
    console.log(error);
    return {
      contractAddress,
      isERC1155: false,
      isERC721: false,
      from,
      hash,
      blockNumber,
      chainId,
    };
  }
};

const contractRecorder = async (blockDataWithTransactions, provider) => {
  const contractTransactions = blockDataWithTransactions.transactions.filter(
    ({ creates }) => creates,
  );
  const promisePipeline = [];
  for (
    let contractIndex = 0;
    contractIndex < contractTransactions.length;
    contractIndex += 1
  ) {
    const cTxn = contractTransactions[contractIndex];
    promisePipeline.push(checkContractType(cTxn, provider));
  }
  const allContracts = await Promise.all(promisePipeline);
  const allNftContracts = allContracts
    .filter(({ isERC1155, isERC721 }) => isERC1155 || isERC721)
    .map((contractInfo) => ({
      ...contractInfo,
      contractType: contractInfo.isERC1155
        ? contractTypes.ERC1155
        : contractTypes.ERC721,
    }));
  const rClient = await getRedisClient();
  allNftContracts.forEach((contractDetails) => rClient.set(
    contractDetails.contractAddress,
    JSON.stringify(contractDetails),
  ));
  await NftContract.insertMany(allNftContracts);
};

module.exports = {
  contractRecorder,
};
