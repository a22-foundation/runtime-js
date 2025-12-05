export class WorkflowEngine {
    constructor(context) {
        this.context = context;
    }
    async execute(workflowBlock, input) {
        console.log(`[Workflow] Starting ${workflowBlock.identifier}`);
        // Find 'steps' block
        const stepsBlock = workflowBlock.children.find(c => c.type === 'steps');
        if (!stepsBlock) {
            console.log(`[Workflow] ${workflowBlock.identifier} has no steps.`);
            return;
        }
        const scope = { input };
        // Sequential execution for now (spec allows topological, but sequential is simpler for start)
        // Steps are attributes in the steps block (steps { step1 = ... })
        // Wait, attributes are key=expr.
        // A22 workflow:
        // steps {
        //   embed = tool "embedder" { ... }
        // }
        // "embed" is key. Value is a Call Expression... wait.
        // My parser: `tool "embedder" { ... }` is a nested BLOCK, not an expression.
        // But `key = value` expects an expression.
        // The Spec says: `embed = tool "embedder" { ... }`
        // This parses as Attribute if `tool ...` is an expression.
        // But `tool "embedder"` is a block definition syntax.
        // 
        // My Parser `parseAttribute`: key = Expression.
        // `parseExpression` supports Literal, List, Map, Reference.
        // It does NOT support Block definitions as values.
        // CRITICAL SPEC ISSUE OR PARSER LIMITATION:
        // If the syntax is `embed = tool "name" { }`, then `tool "name" { }` must be an expression.
        // OR the syntax is `step "embed" { use = tool.name ... }`.
        // Let's re-read the spec example:
        // embed = tool "embedder" { text = input.text }
        // This implies `tool "embedder" { ... }` matches `Expression`.
        // To support this, I need to update Parser to allow a "Block-like Expression" or constructor.
        // OR distinct logic: `embed` is a label for the block?
        // `tool "embedder" "embed" { ... }` ? No.
        // Current Parser `parseExpression`:
        // if identifier -> Reference.
        // If I see `tool`, it's an identifier.
        // If I see `"embedder"`, it's a string.
        // If I see `{`, it's map/block.
        // A22 v0.1 Spec implies inline block instantiation.
        // I should probably simplify my parser or the spec for this "Local First" iteration.
        // Simplification: treating it as a reference if possible, or support `call` expression.
        // For now, I will assume the parser parses `tool "embedder" { ... }` as a Block if it was top level.
        // But inside `steps { ... }`?
        // `steps` is a block.
        // Inside `steps`, we see `embed = ...`. That's an attribute.
        // The value `tool "embedder" { ... }` causes syntax error in my current parser because `tool` is identifier, then `"embedder"` is string. `parseExpression` sees identifier `tool`, then tries `parseReference`. It sees `"embedder"` (String) next, which acts as a valid property access? No, reference expects dot + identifier.
        // WORKAROUND:
        // Modify `steps` to use Blocks instead of Assignments for now?
        // `step "embed" { use = tool.embedder }`
        // OR Update Parser to handle `Identifier String Block` as an Expression (Constructor).
        // Let's go with updating Parser to support `ConstructorExpression`.
        // `tool "name" { ... }` -> Expression.
        // I will stick to what the parser can do or simple fixes.
        // Parsing `key = type "id" { ... }` as an expression.
        // I need to update `parseExpression` in `core/src/parser.ts`.
        // Steps are attributes in the steps block (steps { step1 = tool... })
        for (const attr of stepsBlock.attributes) {
            const stepName = attr.key;
            const expr = attr.value;
            if (expr.kind === 'BlockExpression') {
                // e.g. tool "console" { message = "pong" }
                if (expr.type === 'tool') {
                    // Execute tool
                    const toolName = expr.identifier || "";
                    const inputs = {};
                    // Evaluate inputs from block attributes
                    for (const inputAttr of expr.body.attributes) {
                        inputs[inputAttr.key] = this.evaluateExpression(inputAttr.value, scope);
                    }
                    console.log(`[WorkflowStep] ${stepName}: Executing tool '${toolName}' with inputs`, inputs);
                    // Add result to scope (mock)
                    scope[stepName] = { result: "success" };
                }
            }
        }
        return null;
    }
    evaluateExpression(expr, scope) {
        if (expr.kind === 'Literal')
            return expr.value;
        // implement refs later
        return null;
    }
}
