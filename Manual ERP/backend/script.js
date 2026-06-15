const fs = require('fs');
const files = [
  'src/controllers/purchases.ts',
  'src/controllers/reports.ts',
  'src/controllers/sales.ts',
  'src/controllers/taxes.ts'
];

let typesContent = fs.readFileSync('src/types/index.ts', 'utf8');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // 1. findUnique -> findFirst
  newContent = newContent.replace(/\.findUnique\(\s*\{\s*where:\s*\{\s*id\s*\}\s*\}\s*\)/g, '.findFirst({ where: { id, companyId } })');
  newContent = newContent.replace(/\.findUnique\(\s*\{\s*where:\s*\{\s*id:\s*([a-zA-Z0-9_]+)\s*\}\s*(,\s*select:[\s\S]*?)?\}\s*\)/g, '.findFirst({ where: { id: $1, companyId }$2})');
  newContent = newContent.replace(/\.findUnique\(\s*\{\s*where:\s*\{\s*id:\s*([a-zA-Z0-9_\.]+)\s*\}\s*\}\s*\)/g, '.findFirst({ where: { id: $1, companyId } })');

  // 3. Add Zod Validation
  const funcRegex = /export async function ([a-zA-Z0-9_]+)\([^)]+\) \{([\s\S]*?)(?=\nexport async function|\Z)/g;
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    const funcName = match[1];
    let funcBody = match[2];
    
    // Check req.body
    const bodyMatch = funcBody.match(/const\s+\{([^}]+)\}\s*=\s*req\.body;/);
    if (bodyMatch) {
      // FIX variable parsing
      const rawVars = bodyMatch[1].split(',').map(v => v.trim()).filter(v => v);
      const vars = rawVars.map(v => {
        // e.g. "foo: bar" -> "foo"
        // e.g. "foo = 2" -> "foo"
        return v.split(':')[0].split('=')[0].trim();
      });
      const schemaName = funcName.charAt(0).toUpperCase() + funcName.slice(1) + 'BodySchema';
      if (!typesContent.includes(`export const ${schemaName}`)) {
        const schemaProps = vars.map(v => `  ${v.match(/^[a-zA-Z0-9_]+$/) ? v : `"${v}"`}: z.any().optional()`).join(',\n');
        typesContent += `\nexport const ${schemaName} = z.object({\n${schemaProps}\n}).passthrough();\n`;
      }
      
      const validationCode = `
    const parsedBody = ${schemaName}.safeParse(req.body);
    if (!parsedBody.success) return res.status(400).json({ error: "Bad Request", details: parsedBody.error });
    const { ${bodyMatch[1]} } = parsedBody.data;
`;
      if (!newContent.includes(`parsedBody = ${schemaName}`)) {
        newContent = newContent.replace(bodyMatch[0], validationCode);
      }
      
      if (!newContent.includes(`import { ${schemaName}`)) {
        const importStatement = `import { ${schemaName} } from '../types/index';\n`;
        newContent = importStatement + newContent;
      }
    }

    // Check req.query
    const queryMatch = funcBody.match(/const\s+\{([^}]+)\}\s*=\s*req\.query;/);
    if (queryMatch) {
      const rawVars = queryMatch[1].split(',').map(v => v.trim()).filter(v => v);
      const vars = rawVars.map(v => v.split(':')[0].split('=')[0].trim());
      const schemaName = funcName.charAt(0).toUpperCase() + funcName.slice(1) + 'QuerySchema';
      if (!typesContent.includes(`export const ${schemaName}`)) {
        const schemaProps = vars.map(v => `  ${v.match(/^[a-zA-Z0-9_]+$/) ? v : `"${v}"`}: z.any().optional()`).join(',\n');
        typesContent += `\nexport const ${schemaName} = z.object({\n${schemaProps}\n}).passthrough();\n`;
      }
      
      const validationCode = `
    const parsedQuery = ${schemaName}.safeParse(req.query);
    if (!parsedQuery.success) return res.status(400).json({ error: "Bad Request", details: parsedQuery.error });
    const { ${queryMatch[1]} } = parsedQuery.data;
`;
      if (!newContent.includes(`parsedQuery = ${schemaName}`)) {
         newContent = newContent.replace(queryMatch[0], validationCode);
      }
      
      if (!newContent.includes(`import { ${schemaName}`)) {
        const importStatement = `import { ${schemaName} } from '../types/index';\n`;
        newContent = importStatement + newContent;
      }
    } else if (funcBody.includes('req.query.format') || funcBody.includes('req.query.startDate')) {
       const schemaName = funcName.charAt(0).toUpperCase() + funcName.slice(1) + 'QuerySchema';
       if (!typesContent.includes(`export const ${schemaName}`)) {
         typesContent += `\nexport const ${schemaName} = z.object({\n  format: z.string().optional(),\n  startDate: z.string().optional(),\n  endDate: z.string().optional()\n}).passthrough();\n`;
       }
       
       const queryValidation = `
    const parsedQuery = ${schemaName}.safeParse(req.query);
    if (!parsedQuery.success) return res.status(400).json({ error: "Bad Request", details: parsedQuery.error });
`;     
       if (!newContent.includes(`parsedQuery = ${schemaName}`)) {
         newContent = newContent.replace(/(if \(!companyId\) return res\.status\(401\)\.json\(\{ error: "Unauthorized" \}\);)/, `$1\n${queryValidation}`);
       }
       
       if (!newContent.includes(`import { ${schemaName}`)) {
         const importStatement = `import { ${schemaName} } from '../types/index';\n`;
         newContent = importStatement + newContent;
       }
    }
  }

  fs.writeFileSync(file, newContent, 'utf8');
});

fs.writeFileSync('src/types/index.ts', typesContent, 'utf8');
console.log('Done!');
