const { newBlockHandler } = require('./newBlockUtils');
const { getProvider } = require('../utils/providers');
const { contractRecorder } = require('./newBlockUtils/nftContractListener');
const { logHandler } = require('../utils/log-handler');

const evmProvider = getProvider();
const evmProvider2 = getProvider(2);

evmProvider.on({ topics: [] }, (log) => logHandler(log, evmProvider));

evmProvider2.on('block', async (blockNumber) => {
  newBlockHandler(
    blockNumber,
    evmProvider2,
    async (blockDataWithTransactions) => {
      await contractRecorder(blockDataWithTransactions, evmProvider2);
    },
  );
});

// [
//   {
//     '$match': {
//       '$or': [
//         {
//           'from': '0xcbb94271985be77E11C18141150fEF151514A62f'
//         }, {
//           'to': '0xcbb94271985be77E11C18141150fEF151514A62f'
//         }
//       ]
//     }
//   }, {
//     '$group': {
//       '_id': {
//         'contractAddress': '$contractAddress',
//         'tokenId': '$tokenId'
//       },
//       'balance': {
//         '$sum': {
//           '$cond': [
//             {
//               '$eq': [
//                 '$to', '0xcbb94271985be77E11C18141150fEF151514A62f'
//               ]
//             }, {
//               '$toInt': '$amount'
//             }, {
//               '$multiply': [
//                 {
//                   '$toInt': '$amount'
//                 }, -1
//               ]
//             }
//           ]
//         }
//       }
//     }
//   }, {
//     '$match': {
//       'balance': {
//         '$gt': 0
//       }
//     }
//   }, {
//     '$project': {
//       '_id': 0,
//       'contractAddress': '$_id.contractAddress',
//       'tokenId': '$_id.tokenId',
//       'balance': '$balance'
//     }
//   },
// {
//     '$lookup': {
//       'from': 'nftcontracts',
//       'localField': 'contractAddress',
//       'foreignField': 'contractAddress',
//       'as': 'collection'
//     }
//   }, {
//     '$unwind': {
//       'path': '$collection',
//       'preserveNullAndEmptyArrays': true
//     }
//   }
// ]
