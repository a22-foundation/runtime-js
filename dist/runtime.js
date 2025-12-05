import { Lexer } from 'core/dist/lexer.js';
import { A22Parser } from 'core/dist/parser.js';
import * as fs from 'fs';
export class Runtime {
    constructor() {
        this.blocks = new Map();
    }
    load(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lexer = new Lexer(content);
        const tokens = lexer.tokenize();
        const parser = new A22Parser(tokens);
        const program = parser.parse();
        for (const block of program.blocks) {
            const id = `${block.type}.${block.identifier}`;
            this.blocks.set(id, block);
        }
    }
    async emit(eventName, payload) {
        console.log(`[Runtime] Event '${eventName}' emitted`);
        for (const [id, block] of this.blocks) {
            if (block.type === 'agent') {
                const onBlock = block.children?.find(c => c.type === 'on' && c.identifier === 'event' && c.label === eventName);
                if (onBlock) {
                    console.log(`[Runtime] Agent '${block.identifier}' handling event '${eventName}'`);
                    await this.executeHandler(onBlock, payload);
                }
            }
        }
    }
    async executeHandler(block, payload) {
        if (!block.children)
            return;
        for (const child of block.children) {
            if (child.type === 'call' && child.identifier === 'workflow') {
                const workflowName = child.label;
                if (workflowName) {
                    await this.callWorkflow(workflowName, payload);
                }
            }
            else if (child.type === 'use' && child.identifier === 'tool') {
                // usage declaration, maybe ignore or setup context
            }
        }
    }
    async callWorkflow(name, input) {
        const workflowId = `workflow.${name}`;
        const workflowBlock = this.blocks.get(workflowId);
        if (!workflowBlock) {
            console.error(`[Runtime] Workflow '${name}' not found.`);
            return;
        }
        const { WorkflowEngine } = await import('./workflow.js');
        const engine = new WorkflowEngine(this);
        await engine.execute(workflowBlock, input);
    }
}
