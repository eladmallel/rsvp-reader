# Manual Readwise Sync Feature - Implementation Plan

## Overview

Add manual Readwise sync functionality triggered by the user via a dropdown menu in the Library page header. The sync runs for the current user only and provides visual feedback during the process.

## User Requirements

- Three-dot button in Library header opens a dropdown menu
- Menu contains "Sync Readwise" button
- Clicking triggers sync for logged-in user only (not all users)
- Button shows loading state and is disabled while syncing
- UI polls for sync status and refreshes page when complete
- Simple, clean implementation

## Implementation Approach

### Backend: Two New API Endpoints

**1. POST `/api/sync/readwise/trigger`** - Initiates sync for current user

- Authenticates user via Supabase session
- Validates user has Readwise connected
- Checks not already syncing (`in_progress` flag)
- Enforces rate limiting (`next_allowed_at`)
- Acquires optimistic lock (set `in_progress = true`)
- Calls shared `syncUser()` function asynchronously
- Returns immediately (doesn't wait for completion)

**2. GET `/api/sync/readwise/status`** - Returns current sync status

- Authenticates user
- Queries `readwise_sync_state` table
- Returns: `{ inProgress: boolean, lastSyncAt: string, nextAllowedAt: string }`

### Frontend: Dropdown Menu Component

**1. Create `DropdownMenu` Component**

- Positioned absolutely below trigger button
- Click outside to close
- Escape key to close
- Simple list of menu items
- Backdrop overlay

**2. Update Library Page**

- Wire three-dot button to open dropdown
- Add "Sync Readwise" menu item
- Implement trigger + polling logic
- Show loading state on button while syncing
- Refresh articles when sync completes

### State Management & Polling

**Sync Flow:**

1. User clicks "Sync Readwise"
2. POST to `/api/sync/readwise/trigger`
3. Start polling `/api/sync/readwise/status` every 3 seconds
4. Button shows "Syncing..." and is disabled
5. When `inProgress: false`, stop polling
6. Re-fetch articles to show new content
7. Re-enable button

**Error Handling:**

- Not connected → Show "Connect Readwise first"
- Already syncing → Show "Sync in progress..."
- Rate limited → Show "Available in X minutes"
- Network error → Show "Failed. Try again."

## Files to Create

### Backend

1. **`src/app/api/sync/readwise/trigger/route.ts`**
   - POST handler for manual sync trigger
   - Auth check, validation, lock acquisition
   - Async call to `syncUser()`

2. **`src/app/api/sync/readwise/status/route.ts`**
   - GET handler for sync status
   - Returns current state from database

3. **`src/lib/sync/syncUser.ts`**
   - Extract `syncUser()` from existing `/api/sync/readwise/route.ts`
   - Shared function for both manual and automated syncs

### Frontend

4. **`src/components/ui/DropdownMenu.tsx`**
   - Generic dropdown component
   - Props: `isOpen`, `onClose`, `trigger`, `children`
   - Click outside handling, escape key, backdrop

5. **`src/components/ui/DropdownMenu.module.css`**
   - Dropdown positioning and animations
   - Menu item styles

6. **`src/types/sync.ts`**
   - TypeScript interfaces: `SyncStatus`, `SyncTriggerResponse`

## Files to Modify

1. **`src/app/(main)/library/page.tsx`**
   - Add dropdown state: `isMenuOpen`, `isSyncing`, `syncError`
   - Implement `handleSyncTrigger()` function
   - Implement polling effect with `useEffect`
   - Update three-dot button handler to toggle dropdown
   - Add DropdownMenu with "Sync Readwise" item
   - Refresh articles after sync completes

2. **`src/app/api/sync/readwise/route.ts`**
   - Refactor to import shared `syncUser()` from `/lib/sync/syncUser.ts`
   - Keep cron logic for all-users sync

## Implementation Details

### Backend API Design

**Trigger Endpoint (`/api/sync/readwise/trigger/route.ts`):**

```typescript
export async function POST(request: NextRequest) {
  // 1. Authenticate user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Get sync state + check if Readwise connected
  const { data: state } = await supabase
    .from('readwise_sync_state')
    .select('*, users!inner(reader_access_token)')
    .eq('user_id', user.id)
    .single();

  if (!state?.users?.reader_access_token) {
    return NextResponse.json({ error: 'Readwise not connected' }, { status: 400 });
  }

  // 3. Check if already syncing
  if (state.in_progress) {
    return NextResponse.json({ error: 'Sync already in progress' }, { status: 400 });
  }

  // 4. Check rate limiting
  const now = new Date();
  if (state.next_allowed_at && new Date(state.next_allowed_at) > now) {
    return NextResponse.json(
      {
        error: 'Rate limited',
        nextAllowedAt: state.next_allowed_at,
      },
      { status: 429 }
    );
  }

  // 5. Acquire lock (optimistic locking)
  const { data: locked } = await supabase
    .from('readwise_sync_state')
    .update({ in_progress: true })
    .eq('user_id', user.id)
    .eq('in_progress', false) // Only update if still false
    .select()
    .single();

  if (!locked) {
    return NextResponse.json({ error: 'Failed to acquire lock' }, { status: 500 });
  }

  // 6. Start sync asynchronously (don't await)
  const apiClient = new ReaderApiClient(state.users.reader_access_token);
  syncUser(user.id, apiClient).catch((err) =>
    console.error(`Manual sync failed for user ${user.id}:`, err)
  );

  return NextResponse.json({ success: true, jobId: user.id });
}
```

**Status Endpoint (`/api/sync/readwise/status/route.ts`):**

```typescript
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: state } = await supabase
    .from('readwise_sync_state')
    .select('in_progress, last_sync_at, next_allowed_at')
    .eq('user_id', user.id)
    .single();

  if (!state) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    inProgress: state.in_progress,
    lastSyncAt: state.last_sync_at,
    nextAllowedAt: state.next_allowed_at,
  });
}
```

### Frontend Implementation

**Library Page Changes (`src/app/(main)/library/page.tsx`):**

```typescript
// Add state
const [isMenuOpen, setIsMenuOpen] = useState(false);
const [isSyncing, setIsSyncing] = useState(false);
const [syncError, setSyncError] = useState<string | null>(null);

// Trigger sync
const handleSyncTrigger = async () => {
  setIsMenuOpen(false);
  setSyncError(null);

  try {
    const res = await fetch('/api/sync/readwise/trigger', { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      setSyncError(data.error || 'Failed to start sync');
      return;
    }

    setIsSyncing(true);
  } catch (err) {
    setSyncError('Network error');
  }
};

// Polling effect
useEffect(() => {
  if (!isSyncing) return;

  let intervalId: NodeJS.Timeout;
  let cancelled = false;

  const poll = async () => {
    try {
      const res = await fetch('/api/sync/readwise/status');
      const data = await res.json();

      if (!cancelled) {
        if (!data.inProgress) {
          setIsSyncing(false);
          // Refresh articles
          await fetchDocuments(activeSubTab);
        }
      }
    } catch (err) {
      if (!cancelled) {
        setSyncError('Status check failed');
        setIsSyncing(false);
      }
    }
  };

  // Poll immediately, then every 3 seconds
  poll();
  intervalId = setInterval(poll, 3000);

  return () => {
    cancelled = true;
    clearInterval(intervalId);
  };
}, [isSyncing, activeSubTab]);

// Update three-dot button handler
const handleMenuClick = () => setIsMenuOpen(!isMenuOpen);

// In JSX, add dropdown after three-dot button:
<DropdownMenu
  isOpen={isMenuOpen}
  onClose={() => setIsMenuOpen(false)}
>
  <button
    onClick={handleSyncTrigger}
    disabled={isSyncing}
    className={styles.menuItem}
  >
    {isSyncing ? 'Syncing...' : 'Sync Readwise'}
  </button>
</DropdownMenu>

{syncError && (
  <div className={styles.errorMessage}>{syncError}</div>
)}
```

**DropdownMenu Component (`src/components/ui/DropdownMenu.tsx`):**

```typescript
interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  triggerRef?: React.RefObject<HTMLElement>;
}

export function DropdownMenu({ isOpen, onClose, children, triggerRef }: DropdownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div ref={menuRef} className={styles.menu} role="menu">
        {children}
      </div>
    </>
  );
}
```

## Testing Strategy

### Manual Testing Checklist

1. **Happy Path**
   - Click three-dot button → dropdown opens
   - Click "Sync Readwise" → button shows "Syncing..."
   - Wait for sync to complete → articles refresh automatically
   - Verify new articles appear

2. **Error Cases**
   - Not connected to Readwise → Shows error message
   - Already syncing (via cron) → Shows "Sync in progress"
   - Rate limited → Shows "Available in X minutes"
   - Network error during trigger → Shows error
   - Network error during polling → Handles gracefully

3. **UI/UX**
   - Click outside dropdown → closes
   - Press Escape → closes
   - Button disabled while syncing
   - Can't trigger multiple syncs simultaneously

4. **Edge Cases**
   - Close dropdown while syncing → polling continues
   - Navigate away during sync → no memory leaks
   - Sync completes while on different tab → articles still refresh on return

### Integration Testing

- Test concurrent sync prevention (optimistic locking)
- Test polling stops when sync completes
- Test article refresh after sync
- Test rate limit enforcement

## Verification Steps

After implementation:

1. ✅ Run `npm run type-check` - No TypeScript errors
2. ✅ Run `npm run lint` - No lint errors
3. ✅ Run `npm run test` - All tests pass
4. ✅ Manual test all scenarios above
5. ✅ Test on mobile viewport (responsive dropdown)
6. ✅ Test in both light and dark themes
7. ✅ Verify no console errors
8. ✅ Commit with message: `feat: add manual Readwise sync with dropdown menu`

## Critical Files Reference

| Purpose             | File Path                                                    |
| ------------------- | ------------------------------------------------------------ |
| Existing sync logic | `src/app/api/sync/readwise/route.ts`                         |
| Library page        | `src/app/(main)/library/page.tsx`                            |
| Sync state schema   | `supabase/migrations/20260201000000_readwise_sync_state.sql` |
| Supabase client     | `src/lib/supabase/server.ts`                                 |
| Reader API client   | `src/lib/reader/api.ts`                                      |

## Estimated Complexity

- **Backend**: Simple (reuse existing sync logic)
- **Frontend**: Moderate (new dropdown component + polling)
- **Total Time**: 2-3 hours including testing
