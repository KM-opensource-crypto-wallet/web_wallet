import init, {defaultConfig, SdkBuilder} from '@breeztech/breez-sdk-spark/web';
import {config, IS_SANDBOX} from 'dok-wallet-blockchain-networks/config/config';

class JsEventListener {
  constructor(callback) {
    this.callback = callback;
  }

  onEvent = event => {
    if (this.callback) {
      this.callback(event);
    }
  };
}

function decimalStringToBigInt(value, decimals) {
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error('Invalid decimal string');
  }

  const [intPart, fracPart = ''] = value.split('.');
  const paddedFrac = (fracPart + '0'.repeat(decimals)).slice(0, decimals);

  return BigInt(intPart + paddedFrac);
}

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
    console.log('✅ Breez SDK connected');
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
      console.log('♻️ Reusing SDK');
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
      console.log('Error', 'SDK not connected or no payment request');
      return;
    }
    const prepareResponse = await sdk.prepareSendPayment({
      paymentRequest,
      amount: decimalStringToBigInt(amount, 8),
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
    console.log('Prepare Error', err.message);
  }
}

function satoshiToBtc(sats) {
  if (sats === null || sats === undefined) return 0;

  // Handle BigInt or number or string safely
  const satsNumber = Number(sats);

  return satsNumber / 1e8;
}

export const getLightningBalance = async phrase => {
  try {
    const sdk = await connectToSdk(phrase);
    const info = await sdk.getInfo({});
    return info.balanceSats;
  } catch (error) {
    console.log(error);
  }
};

export const isLightningAddressValid = async (address, phrase) => {
  try {
    const sdk = await connectToSdk(phrase);
    if (!sdk) {
      console.log('Error', 'SDK not connected or no payment request');
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
    console.log(error);
    return false;
  }
};

export const generateLightningInvoiceViaBolt11 = async phrase => {
  try {
    const sdk = await connectToSdk(phrase);
    if (!sdk) {
      console.log('Error', 'SDK not connected');
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
    console.log('Invoice Error', error.message);
  }
};

export const generateLightningSparkAddress = async phrase => {
  try {
    const sdk = await connectToSdk(phrase);
    console.log('sdk:', sdk);
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
      console.log('Error', 'SDK not connected');
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
    console.log('Invoice Error', err.message);
  }
};

export const prepareLightning = async (phrase, toAddress, amount) => {
  try {
    const {lightningFee} = await prepareAndSendPayment(
      phrase,
      toAddress,
      amount,
    );
    const fee = satoshiToBtc(lightningFee);
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
      console.log('Error', 'SDK not connected or no payment request');
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

export const waitForLightningConfirmation = async phrase => {
  const sdk = await connectToSdk(phrase);

  if (!sdk) {
    console.log('Error', 'SDK not connected');
    return;
  }

  return new Promise((resolve, reject) => {
    let listenerId = null;
    let timeoutId = null;
    let resolved = false;

    try {
      const eventListener = new JsEventListener(async event => {
        if (resolved) return;

        if (event.type === 'PaymentSucceeded' || event.type === 'synced') {
          resolved = true;

          // 🧹 cleanup
          if (listenerId !== null) {
            sdk.removeEventListener(listenerId);
          }
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          resolve(true);
        }
      });

      listenerId = sdk.addEventListener(eventListener);

      // ⏱️ 90 seconds timeout
      timeoutId = setTimeout(() => {
        if (resolved) return;

        resolved = true;

        console.log('⏱️ Payment confirmation timeout (90s)');

        // 🧹 cleanup
        if (listenerId !== null) {
          sdk.removeEventListener(listenerId);
        }

        resolve('pending');
      }, 90_000); // 90 seconds
    } catch (error) {
      console.error('Error in waitForConfirmation:', error);

      // 🧹 cleanup
      if (listenerId !== null) {
        sdk.removeEventListener(listenerId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      reject(error);
    }
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
    const transactions = response.payments;
    if (Array.isArray(transactions)) {
      return transactions.map(item => {
        const txHash = item?.details.inner?.paymentHash || item?.id || 'N/A';
        return {
          amount: item.amount,
          link: txHash?.substring(0, 13) + '...',
          url: `${config.BITCOIN_LIGHTNING_URL}/tx/${txHash}`,
          status:
            item?.status.toLowerCase() !== 'completed' ? 'Pending' : 'SUCCESS',
          date: Number(item?.timestamp) * 1000,
          from: item?.details.inner?.preimage,
          to: item?.details.inner?.destinationPubKey,
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
        amount: satoshiToBtc(deposit.amountSats),
        fees: satoshiToBtc(requiredFeeRate),
        receivedAmount: satoshiToBtc(amountReceive),
      });
    }

    return result;
  } catch (error) {
    console.error(`error getting transactions for bitcoin lightning ${error}`);
    return [];
  }
};

export const approveClaimDepositRequest = async (phrase, txid, vout) => {
  try {
    const sdk = await connectToSdk(phrase);
    if (!sdk) return;
    const response = await sdk.listUnclaimedDeposits({});
    const recommendedFees = await sdk.recommendedFees();
    for (const deposit of response.deposits) {
      if (
        deposit.claimError?.type === 'maxDepositClaimFeeExceeded' &&
        deposit.txid === txid &&
        deposit.vout === vout
      ) {
        const requiredFeeRate = deposit.claimError.requiredFeeSats || BigInt(0);

        if (requiredFeeRate <= recommendedFees.fastestFee) {
          const claimRequest = {
            txid: deposit.txid,
            vout: deposit.vout,
            maxFee: {type: 'fixed', amount: requiredFeeRate},
          };
          await sdk.claimDeposit(claimRequest);
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    console.error(`error getting transactions for bitcoin lightning ${error}`);
    return false;
  }
};

export const refundClaimRequest = async (
  phrase,
  txid,
  vout,
  destinationAddress,
) => {
  try {
    const sdk = await connectToSdk(phrase);
    if (!sdk) return;
    const feeEstimates = {
      slow: 500,
      medium: 1000,
      fast: 2000,
    };

    const recommendedFees = await sdk.recommendedFees();
    const fee = {type: 'fixed', amount: feeEstimates['fast']};
    const request = {
      txid,
      vout,
      destinationAddress,
      fee,
    };
    const response = await sdk.refundDeposit(request);
    return true;
  } catch (error) {
    console.log(JSON.stringify(error));
    console.error(`error getting transactions for bitcoin lightning ${error}`);
    return false;
  }
};
