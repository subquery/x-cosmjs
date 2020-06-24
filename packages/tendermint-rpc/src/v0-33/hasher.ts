import { Sha256 } from "@cosmjs/crypto";

import { encodeBlockId, encodeBytes, encodeInt, encodeString, encodeTime, encodeVersion } from "../encodings";
import { Header } from "../responses";
import { BlockHash, TxBytes, TxHash } from "../types";

// hash is sha256
// https://github.com/tendermint/tendermint/blob/master/UPGRADING.md#v0260
export function hashTx(tx: TxBytes): TxHash {
  const hash = new Sha256(tx).digest();
  return hash as TxHash;
}

function getSplitPoint(n: number): number {
  if (n < 1) throw new Error("Cannot split an empty tree");
  const largestPowerOf2 = 2 ** Math.floor(Math.log2(n));
  return largestPowerOf2 < n ? largestPowerOf2 : largestPowerOf2 / 2;
}

function hashLeaf(leaf: Uint8Array): Uint8Array {
  const hash = new Sha256(Uint8Array.from([0]));
  hash.update(leaf);
  return hash.digest();
}

function hashInner(left: Uint8Array, right: Uint8Array): Uint8Array {
  const hash = new Sha256(Uint8Array.from([1]));
  hash.update(left);
  hash.update(right);
  return hash.digest();
}

// See https://github.com/tendermint/tendermint/blob/v0.31.8/docs/spec/blockchain/encoding.md#merkleroot
// Note: the hashes input may not actually be hashes, especially before a recursive call
function hashTree(hashes: readonly Uint8Array[]): Uint8Array {
  switch (hashes.length) {
    case 0:
      throw new Error("Cannot hash empty tree");
    case 1:
      return hashLeaf(hashes[0]);
    default: {
      const slicePoint = getSplitPoint(hashes.length);
      const left = hashTree(hashes.slice(0, slicePoint));
      const right = hashTree(hashes.slice(slicePoint));
      return hashInner(left, right);
    }
  }
}

export function hashBlock(header: Header): BlockHash {
  const encodedFields: readonly Uint8Array[] = [
    encodeVersion(header.version),
    encodeString(header.chainId),
    encodeInt(header.height),
    encodeTime(header.time),
    encodeBlockId(header.lastBlockId),

    encodeBytes(header.lastCommitHash),
    encodeBytes(header.dataHash),
    encodeBytes(header.validatorsHash),
    encodeBytes(header.nextValidatorsHash),
    encodeBytes(header.consensusHash),
    encodeBytes(header.appHash),
    encodeBytes(header.lastResultsHash),
    encodeBytes(header.evidenceHash),
    encodeBytes(header.proposerAddress),
  ];
  return hashTree(encodedFields) as BlockHash;
}
