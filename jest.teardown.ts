/**
 * Jest Global Teardown
 * Ensures all connections are closed after all tests
 */
export default async () => {
  // Give extra time for async cleanup
  await new Promise((resolve) => setTimeout(resolve, 500));
};
