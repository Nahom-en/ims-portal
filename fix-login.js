const fs = require('fs');
let code = fs.readFileSync('src/app/auth/login/page.tsx', 'utf8');

// 1. Change "Authentication" to "WELCOME."
code = code.replace(/>\s*Authentication\s*<\/h1>/, ">WELCOME.</h1>");

// 2. Remove ArrowRight
code = code.replace(/<ArrowRight className="h-4 w-4" \/>/, '');
code = code.replace(/ArrowRight \}/, 'ArrowRight, ShieldCheck }');

// 3 & 4. Update Footer
code = code.replace(/\{\/\* Footer note \*\/\}[\s\S]*?<\/div>/, 
`{/* Footer note */}
          <div className="mt-8 flex items-center justify-center gap-2 text-slate-500 text-[11px] font-bold tracking-widest uppercase">
            <ShieldCheck className="h-5 w-5 opacity-90" weight="duotone" style={{ color: "var(--coral)" }} />
            <div className="text-left leading-[1.4]">
              ISO CERTIFIED <br />
              MMCY {new Date().getFullYear()}
            </div>
          </div>`
);

fs.writeFileSync('src/app/auth/login/page.tsx', code);
