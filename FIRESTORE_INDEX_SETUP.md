# Firestore Index Setup Guide

## Required Indexes

Your Firestore database requires composite indexes for certain queries. Here's how to set them up:

### 1. Comments Index (Required)

**Collection:** `comments`
**Fields:**
- `postId` (Ascending)
- `createdAt` (Ascending)

**Create it here:**
https://console.firebase.google.com/v1/r/project/haelr-462818/firestore/indexes?create_composite=Ck1wcm9qZWN0cy9oYWVsci00NjI4MTgvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2NvbW1lbnRzL2luZGV4ZXMvXxABGgoKBnBvc3RJZBABGg0KCWNyZWF0ZWRBdBABGgwKCF9fbmFtZV9fEAE

**Or manually:**
1. Go to [Firebase Console](https://console.firebase.google.com/project/haelr-462818/firestore/indexes)
2. Click "Create Index"
3. Collection ID: `comments`
4. Add fields:
   - Field: `postId`, Order: Ascending
   - Field: `createdAt`, Order: Ascending
5. Click "Create"

### 2. Posts Index (Optional - for Top Posts)

**Collection:** `posts`
**Fields:**
- `upvoteCount` (Descending)

**Note:** This is only needed if you want to sort posts by upvotes. The app will fall back to sorting by `createdAt` if this index doesn't exist.

### 3. Posts by Tag Index (Optional)

**Collection:** `posts`
**Fields:**
- `tags` (Array contains)
- `createdAt` (Descending)

**Note:** This is only needed if you want to filter posts by tags and sort by date.

## Automatic Index Creation

Firebase will automatically prompt you to create indexes when you first use a query that requires one. You can:

1. Click the link in the error message
2. Or wait for Firebase to suggest creating the index automatically
3. Or manually create them using the steps above

## Index Status

- **Building:** Index is being created (can take a few minutes)
- **Enabled:** Index is ready to use
- **Error:** Index creation failed (check error message)

## Important Notes

- Indexes are free to create but count towards your Firestore usage
- Once created, indexes are permanent (but you can delete unused ones)
- Index creation typically takes 1-5 minutes
- The app will work without indexes but with degraded performance or fallback behavior

## Quick Fix

If you're getting index errors:

1. **For Comments:** The app includes a fallback that sorts comments in memory if the index isn't available. This works but is less efficient.

2. **Create the index:** Use the link above or create it manually in Firebase Console.

3. **Wait for build:** Indexes take a few minutes to build. The app will work once it's ready.

