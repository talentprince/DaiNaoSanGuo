import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// Cocos uses extensionless TypeScript imports. Resolve those for Node's type-stripping tests.
registerHooks({ resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context); }
    catch (error) {
        if (specifier.startsWith('.') && context.parentURL && !/\.[a-z]+$/i.test(specifier)) {
            const url = new URL(specifier + '.ts', context.parentURL);
            if (existsSync(fileURLToPath(url))) return nextResolve(url.href, context);
        }
        throw error;
    }
} });
