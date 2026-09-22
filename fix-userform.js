const fs = require('fs');
let code = fs.readFileSync('src/components/forms/UserForm.tsx', 'utf8');

if (!code.includes('password?: string')) {
  code = code.replace(/email: string\n/g, "email: string\n  password?: string\n");
}

if (!code.includes('password: ""')) {
  code = code.replace(/email: "",/g, 'email: "",\n      password: "",');
}

if (!code.includes('EyeSlash')) {
  code = code.replace(/import \{ useState \} from "react"/, 'import { useState } from "react"\nimport { Eye, EyeSlash } from "@phosphor-icons/react"');
}

if (!code.includes('showPassword')) {
  code = code.replace(/const \[showConfirmRole, setShowConfirmRole\] = useState\(false\)/, 'const [showConfirmRole, setShowConfirmRole] = useState(false)\n  const [showPassword, setShowPassword] = useState(false)');
}

const passwordField = `
      <div className="space-y-2">
        <Label htmlFor="user-password">
          {isEditMode ? "Reset Password (Optional)" : "Temporary Password "}
          {!isEditMode && <span className="text-destructive">*</span>}
        </Label>
        <div className="relative">
          <Input
            id="user-password"
            type={showPassword ? "text" : "password"}
            placeholder={isEditMode ? "Leave blank to keep current" : "Enter temporary password"}
            value={formData.password || ""}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
`;

if (!code.includes('id="user-password"')) {
  code = code.replace(/<\/div>\n\n      <div className="grid grid-cols-2 gap-4">/g, `</div>\n${passwordField}\n      <div className="grid grid-cols-2 gap-4">`);
}

fs.writeFileSync('src/components/forms/UserForm.tsx', code);
