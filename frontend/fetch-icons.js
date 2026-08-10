import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ICONS = [
    'play', 'pause', 'skip-back', 'skip-forward', 
    'volume-2', 'volume-x', 'chevron-up', 'list-music', 
    'sparkles', 'tv'
];

async function main() {
    const dir = path.join(__dirname, 'src', 'components', 'icons');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    for (const icon of ICONS) {
        console.log(`Fetching ${icon}...`);
        try {
            const res = await fetch(`https://lucide-animated.com/r/${icon}.json`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            let content = data.files[0].content;

            // Remove cn import
            content = content.replace(/import \{ cn \} from "@\/lib\/utils";\n*/g, '');
            
            // Replace className={cn(className, "something")} with simple string concatenation
            content = content.replace(/className=\{cn\(([^}]+)\)\}/g, (match, args) => {
                if (args === 'className') return 'className={className}';
                return `className={[${args}].filter(Boolean).join(' ')}`;
            });

            // Save as .tsx (Vite handles TSX automatically)
            const filePath = path.join(dir, `${icon}.tsx`);
            fs.writeFileSync(filePath, content);
            console.log(`Saved ${icon}.tsx`);
        } catch (e) {
            console.error(`Failed to fetch ${icon}:`, e.message);
        }
    }
}

main();
