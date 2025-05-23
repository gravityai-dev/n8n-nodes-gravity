/**
 * Error Handling Utilities for Gravity Nodes
 * Common functions for handling errors in Gravity nodes
 */

import { IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow';

/**
 * Process an error in a consistent way based on continueOnFail setting
 * Returns node execution data if continuing on failure, or throws the appropriate error
 */
export function handleNodeError(
  executeFunctions: IExecuteFunctions,
  error: unknown,
  itemIndex: number
): INodeExecutionData[] | never {
  // Check if the node should continue on fail
  // Note: continueOnFail is a method on the instance, not on executeFunctions
  const shouldContinue = typeof executeFunctions['continueOnFail'] === 'function'
    ? executeFunctions.continueOnFail()
    : false;
    
  if (shouldContinue) {
    const errorObject = error instanceof Error ? error : new Error('Unknown error');
    return [{
      json: { 
        error: errorObject.message,
        itemIndex 
      },
      pairedItem: itemIndex,
    }];
  } else {
    // Adding itemIndex for error context
    if (error instanceof Error && error.constructor.name !== 'NodeOperationError') {
      throw new NodeOperationError(executeFunctions.getNode(), error, { itemIndex });
    }
    throw error;
  }
}

/**
 * Create appropriate error handling for output node based on error handling strategy
 */
export function handleOutputError(
  executeFunctions: IExecuteFunctions,
  error: unknown,
  itemIndex: number,
  errorHandling: 'throw' | 'continue',
  outputType: string,
  item: INodeExecutionData
): INodeExecutionData[] | never {
  // Format error message
  let errorMessage = 'An unknown error occurred';
  if (error instanceof Error) {
    errorMessage = error.message;
  }
  
  // Based on error handling strategy
  if (errorHandling === 'throw') {
    throw new NodeOperationError(
      executeFunctions.getNode(),
      errorMessage,
      { itemIndex }
    );
  } else {
    // Continue with execution but include error in output
    console.error(`[Gravity Output] ${errorMessage}`);
    return [{
      json: {
        ...item.json,
        success: false,
        error: errorMessage,
        outputType,
        timestamp: new Date().toISOString(),
      },
      pairedItem: itemIndex,
    }];
  }
}
