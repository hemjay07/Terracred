import { ContractFunctionParameters } from "@hashgraph/sdk";

// Purpose: Helper class to build contract function parameters for smart contract calls
// Example usage:
// const params = new ContractFunctionParameterBuilder()
//   .addParam({ type: "address", name: "token", value: tokenAddress })
//   .addParam({ type: "uint256", name: "amount", value: amount });

export type Param = {
  type: string,
  name: string,
  value: any
};

export class ContractFunctionParameterBuilder {
  params: Param[] = [];

  addParam(param: Param) {
    this.params.push(param);
    return this;
  }

  // Build Hedera API parameters
  buildHAPIParams() {
    const constructorParams = new ContractFunctionParameters();
    this.params.forEach((param) => {
      switch (param.type) {
        case "address":
          constructorParams.addAddress(param.value);
          break;
        case "uint256":
          constructorParams.addUint256(param.value);
          break;
        case "string":
          constructorParams.addString(param.value);
          break;
        default:
          throw new Error(`Unsupported parameter type: ${param.type}`);
      }
    });
    return constructorParams;
  }
}
