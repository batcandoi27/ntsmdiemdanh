# Password Protection Implementation

## Goal
Protect sensitive actions and pages with a password: `266haithuong`.
Areas to protect:
1. `/import` page.
2. `/settings` page.
3. "Thêm Lớp Mới" (Add Class) action in Class List.

## Proposed Changes

### 1. New Component: `src/components/auth/password-protection.tsx`
- A wrapper component or simple modal that requires input.
- **Props**: `onSuccess: () => void`, `children?`.
- **State**: Input value, error message.
- **Logic**: Check input against `266haithuong`. If correct, execute `onSuccess` or render children.

### 2. Protect `/import` (`src/app/import/page.tsx`)
- Wrap the entire content (or returning null until auth) with the Password Protection component.
- Or show a "Login to Access" screen if not verified.
- Use a local state `isAuthenticated` default `false`.

### 3. Protect `/settings` (`src/app/settings/page.tsx`)
- Similar to `/import`, wrap content or show login screen.

### 4. Protect "Add Class" in `src/components/class-list.tsx`
- In `handleCreate` or `openCreateModal`, trigger the Password Modal first.
- If verified, proceed to open the actual `ClassForm` modal.
- **Note**: The user requested "Thêm Lớp mới => thêm bảng thông báo đăng nhập". This specifically targets the button action.

## Implementation Details
- **Password**: `266haithuong` (Hardcoded for simplicity as requested).
- **Style**: Simple modal with Password Input and "Verify" button.

### Component Structure (`PasswordModal`)
```tsx
'use client';
import { useState } from 'react';
import { Lock } from 'lucide-react';

export function PasswordModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
    const [input, setInput] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (input === '266haithuong') {
            onSuccess();
            onClose();
        } else {
            setError('Mật khẩu không đúng!');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                <div className="text-center mb-4">
                    <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-600">
                        <Lock size={24} />
                    </div>
                    <h3 className="font-bold text-lg">Yêu Cầu Mật Khẩu</h3>
                    <p className="text-gray-500 text-sm">Tính năng này yêu cầu quyền quản trị.</p>
                </div>
                <input 
                    type="password" 
                    className="w-full border p-2 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="Nhập mật khẩu..." 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    autoFocus
                />
                {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
                <div className="flex gap-2 mt-4">
                    <button onClick={onClose} className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Hủy</button>
                    <button onClick={handleSubmit} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors">Xác Nhận</button>
                </div>
            </div>
        </div>
    );
}
```

### Page Protection (`/import`, `/settings`)
The requirement is "bảng thông báo đăng nhập, khi người dùng nhập mã đúng... thì mới vào được".
So for pages, when loading the page, show this "Panel" (bảng) instead of content.

```tsx
// Inside Page Component
const [isAuth, setIsAuth] = useState(false);

if (!isAuth) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
             <div className="bg-white rounded-xl p-8 w-full max-w-sm shadow-xl text-center">
                 {/* Login Form Reuse Logic */}
                 ...
             </div>
        </div>
    )
}
return <OriginalContent />
```

I will create `src/components/auth/password-guard.tsx` that blocks page render until authorized.

```tsx
'use client';
import { useState } from 'react';
import { Lock } from 'lucide-react';

export function PasswordGuard({ children }: { children: React.ReactNode }) {
    const [isAuth, setIsAuth] = useState(false);
    const [input, setInput] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (input === '266haithuong') {
            setIsAuth(true);
        } else {
            setError('Mật khẩu không đúng!');
        }
    };

    if (isAuth) return <>{children}</>;

    return (
         <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl border border-gray-100">
                <div className="text-center mb-6">
                    <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                        <Lock size={32} />
                    </div>
                    <h1 className="font-bold text-2xl text-gray-800">Đăng Nhập</h1>
                    <p className="text-gray-500">Vui lòng nhập mật khẩu quản trị để tiếp tục.</p>
                </div>
                
                <div className="space-y-4">
                    <div>
                         <input 
                            type="password" 
                            className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                            placeholder="Mật khẩu..." 
                            value={input}
                            onChange={e => { setInput(e.target.value); setError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        />
                         {error && <p className="text-red-500 text-sm mt-2 ml-1 flex items-center gap-1">⚠️ {error}</p>}
                    </div>
                    
                    <button 
                        onClick={handleSubmit} 
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                    >
                        Truy Cập
                    </button>
                    
                     <p className="text-center text-xs text-gray-400 mt-4">
                        Secure System Access
                    </p>
                </div>
            </div>
        </div>
    );
}
```

This covers both requirements.
- `PasswordGuard` for Pages.
- `PasswordModal` for Button Actions.
