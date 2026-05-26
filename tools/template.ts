// tools/template.ts
export async function run(args: any, config: any) {
  try {
    // 1. Extract arguments passed from the LLM
    const { someParam } = args;
    
    // 2. Perform the logic
    // ...
    
    // 3. Return a clean string for the LLM to process
    return JSON.stringify({ status: "success", data: "..." });
  } catch (err) {
    return JSON.stringify({ status: "error", message: String(err) });
  }
}