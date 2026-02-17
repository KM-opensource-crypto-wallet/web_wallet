import init, {defaultConfig, SdkBuilder} from '@breeztech/breez-sdk-spark/web';
import {IS_SANDBOX} from 'dok-wallet-blockchain-networks/config/config';
import {
  convertToSmallAmount,
  parseBalance,
} from 'dok-wallet-blockchain-networks/helper';

let sdkInstance = null;
let connectingPromise = null;
let prepareSendResponse;
const sdkMap = new Map();

const commonConnectSdk = async mnemonic => {
  try {
    // Initialise the WebAssembly module
    await init();
    // "mainnet" | "regtest";
    const network = IS_SANDBOX ? 'regtest' : 'mainnet';

    // Connect using the config
    let config = defaultConfig(network);
    config.apiKey = process.env.BREEZ_API_KEY;
    config.maxDepositClaimFee = undefined;

    let sdkBuilder = SdkBuilder.new(config, {
      type: 'mnemonic',
      mnemonic: mnemonic,
    });

    sdkBuilder = await sdkBuilder.withDefaultStorage('./.data');

    sdkInstance = await sdkBuilder.build();

    // await sdkInstance.addEventListener(eventListener);
    sdkMap.set(mnemonic, sdkInstance);
    return sdkInstance;
  } catch (err) {
    console.error('❌ Connection error:', err);
    sdkInstance = null;
    connectingPromise = null;
    throw err;
  }
};

async function connectToSdk(phrase) {
  let mnemonic = phrase;
  if (sdkInstance) {
    if (sdkMap.has(mnemonic)) {
      return sdkMap.get(mnemonic);
    } else {
      // Initialize sdkInstance for the new mnemonic
      if (!mnemonic) return sdkInstance;
      connectingPromise = commonConnectSdk(mnemonic);
      return connectingPromise;
    }
  }

  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = commonConnectSdk(mnemonic);

  return connectingPromise;
}

async function prepareAndSendPayment(phrase, paymentRequest, amount) {
  try {
    const sdk = await connectToSdk(phrase);
    if (!sdk || !paymentRequest) {
      console.error('Error', 'SDK not connected or no payment request');
      return;
    }
    const prepareResponse = await sdk.prepareSendPayment({
      paymentRequest,
      amount: BigInt(convertToSmallAmount(amount, 8)),
    });
    prepareSendResponse = prepareResponse;
    if (prepareResponse.paymentMethod?.type === 'bitcoinAddress') {
      const lightningFee =
        prepareResponse.paymentMethod.feeQuote.speedFast.userFeeSat;

      return {
        lightningFee: lightningFee,
        sparkFee: '',
      };
    }
    if (prepareResponse.paymentMethod?.type === 'sparkAddress') {
      const feeSats = prepareResponse.paymentMethod.fee;
      return {
        lightningFee: feeSats,
        sparkFee: '',
      };
    }
    if (prepareResponse.paymentMethod?.type === 'bolt11Invoice') {
      const feeSats = prepareResponse.paymentMethod.lightningFeeSats;
      return {
        lightningFee: feeSats,
        sparkFee: '',
      };
    }
    return {};
  } catch (err) {
    console.error('Error preparing payment:', err);
  }
}

export const getLightningBalance = async phrase => {
  try {
    const sdk = await connectToSdk(phrase);
    const info = await sdk.getInfo({});
    return info.balanceSats;
  } catch (error) {
    console.error(error);
  }
};

export const isLightningAddressValid = async (address, phrase) => {
  try {
    const sdk = await connectToSdk(phrase);
    if (!sdk) {
      console.error('Error', 'SDK not connected or no payment request');
      return;
    }
    const input = await sdk.parse(address);
    if (input.type === 'bitcoinAddress') {
      return true;
    } else if (input.type === 'bolt11Invoice') {
      return true;
    } else if (input.type === 'sparkAddress') {
      return true;
    }
    return false;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const generateLightningInvoiceViaBolt11 = async phrase => {
  try {
    const sdk = await connectToSdk(phrase);
    if (!sdk) {
      console.error('Error', 'SDK not connected');
      return;
    }
    const response = await sdk.receivePayment({
      paymentMethod: {type: 'bolt11Invoice', description: 'Dokwallet Invoice'},
    });
    return {
      address: response.paymentRequest,

      receiveFeeSats: response.fee,
    };
  } catch (error) {
    console.error('Error generating invoice:', error);
  }
};

export const generateLightningSparkAddress = async phrase => {
  try {
    const sdk = await connectToSdk(phrase);
    if (!sdk) {
      console.error('Error', 'SDK not connected');
      return;
    }
    const response = await sdk.receivePayment({
      paymentMethod: {type: 'sparkAddress'},
    });
    return {
      address: response.paymentRequest,
      privateKey: null,
      publicKey: null,
      receiveFeeSats: response.fee,
    };
  } catch (error) {
    console.error('Error generating invoice:', error);
  }
};

export const generateLightningInvoiceViaBitcoinAddress = async phrase => {
  try {
    const sdk = await connectToSdk(phrase);
    if (!sdk) {
      console.error('Error', 'SDK not connected');
      return;
    }
    const response = await sdk.receivePayment({
      paymentMethod: {type: 'bitcoinAddress'},
    });

    return {
      address: response.paymentRequest,
      receiveFeeSats: response.fee,
    };
  } catch (err) {
    console.error('Error generating invoice:', err);
  }
};

export const prepareLightning = async (phrase, toAddress, amount) => {
  try {
    const {lightningFee} = await prepareAndSendPayment(
      phrase,
      toAddress,
      amount,
    );
    const fee = parseBalance(lightningFee, 8);
    return {
      fee: fee,
      estimateGas: 0,
      feesOptions: [],
    };
  } catch (error) {
    console.error('Error in bitcoin gas fee', error);
    throw error;
  }
};

export const sendLightning = async phrase => {
  try {
    const sdk = await connectToSdk(phrase);
    if (!sdk || !prepareSendResponse) {
      console.error('Error', 'SDK not connected or no payment request');
      return;
    }

    // Send the token payment
    const sendResponse = await sdk.sendPayment({
      prepareResponse: prepareSendResponse,
      options: undefined,
      idempotencyKey: undefined,
    });
    const payment = sendResponse.payment;
    return payment.id;
  } catch (error) {
    console.error('Error in bitcoin gas fee', error);
    throw error;
  }
};

export const waitForLightningConfirmation = async (phrase, txData) => {
  const sdk = await connectToSdk(phrase);

  if (!sdk) {
    console.error('Error', 'SDK not connected');
    return;
  }
  const {transaction, interval, retries} = txData || {};

  if (!transaction) {
    console.error('No transaction id found for tron');
    return null;
  }
  return new Promise((resolve, reject) => {
    let numberOfRetries = 0;
    let timer = setInterval(async () => {
      try {
        numberOfRetries += 1;
        const response = await sdk.getPayment({
          paymentId: transaction,
        });
        const status = response.payment.status;
        if (status === 'completed') {
          clearInterval(timer);
          resolve(response);
        } else if (status === 'failed') {
          clearInterval(timer);
          reject('failed');
        } else if (numberOfRetries === retries) {
          clearInterval(timer);
          resolve('pending');
        }
      } catch (e) {
        clearInterval(timer);
        console.error('Error in get transaction for lightning chain', e);
        reject(e);
      }
    }, interval);
  });
};

export const getLightningTransactions = async phrase => {
  try {
    const sdk = await connectToSdk(phrase);
    if (!sdk) return;

    const response = await sdk.listPayments({
      offset: undefined,
      limit: 20,
    });
    let address;
    if (response.payments.length) {
      const response2 = await sdk.receivePayment({
        paymentMethod: {type: 'sparkAddress'},
      });
      address = response2.paymentRequest;
    }
    const transactions = response.payments;

    if (Array.isArray(transactions)) {
      return transactions.map(item => {
        const txHash =
          item?.details.inner?.txId ||
          item?.details.inner?.paymentHash ||
          item?.id ||
          'N/A';
        return {
          amount: item.amount,
          link: txHash?.substring(0, 13) + '...',
          status:
            item?.status.toLowerCase() !== 'completed' ? 'Pending' : 'SUCCESS',
          date: Number(item?.timestamp) * 1000,
          from: item.paymentType === 'send' ? address : null,
          to: item.paymentType === 'send' ? null : address,
          totalCourse: '0$',
          paymentType: item.paymentType,
        };
      });
    }
    return [];
  } catch (error) {
    console.error(`error getting transactions for bitcoin lightning ${error}`);
    return [];
  }
};

export const claimOnchainDeposit = async phrase => {
  try {
    const sdk = await connectToSdk(phrase);
    if (!sdk) return;

    const request = {};
    const result = [];

    const response = await sdk.listUnclaimedDeposits(request);

    for (const deposit of response.deposits) {
      const requiredFeeRate = deposit.claimError.requiredFeeSats || BigInt(0);
      const amountReceive = deposit.amountSats - requiredFeeRate;
      result.push({
        txid: deposit.txid,
        vout: deposit.vout,
        amount: parseBalance(deposit.amountSats, 8),
        fees: parseBalance(requiredFeeRate, 8),
        receivedAmount: parseBalance(amountReceive, 8),
      });
    }

    return result;
  } catch (error) {
    console.error(`error getting transactions for bitcoin lightning ${error}`);
    return [];
  }
};

export const approveClaimDepositRequest = async (phrase, txData) => {
  try {
    const {txid, vout, fees} = txData || {};
    const sdk = await connectToSdk(phrase);
    if (!sdk) return;

    const claimRequest = {
      txid: txid,
      vout: vout,
      maxFee: {type: 'fixed', amount: BigInt(convertToSmallAmount(fees, 8))},
    };
    await sdk.claimDeposit(claimRequest);
    return true;
  } catch (error) {
    console.error(`error getting transactions for bitcoin lightning ${error}`);
    return false;
  }
};

export const refundClaimRequest = async (phrase, txData) => {
  try {
    const {txid, vout, destinationAddress} = txData || {};
    const sdk = await connectToSdk(phrase);
    if (!sdk) return;
    const feeEstimates = {
      slow: 500,
      medium: 1000,
      fast: 2000,
    };

    const fee = {type: 'fixed', amount: feeEstimates['fast']};
    const request = {
      txid,
      vout,
      destinationAddress,
      fee,
    };
    await sdk.refundDeposit(request);
    return true;
  } catch (error) {
    console.error(`error refund transactions for bitcoin lightning ${error}`);
    return false;
  }
};
