#!/usr/bin/env node
import { Runtime } from './runtime.js';
import { fileURLToPath } from 'url';
async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log("Usage: node index.js <file.a22> <event_name> [payload]");
        process.exit(1);
    }
    const [file, eventName, payloadStr] = args;
    const runtime = new Runtime();
    try {
        runtime.load(file);
        console.log(`Loaded ${file}`);
        const payload = payloadStr ? JSON.parse(payloadStr) : {};
        await runtime.emit(eventName, payload);
    }
    catch (e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}
