# Vercel Auto-Deployment Setup

This document explains how to set up automatic deployments to Vercel when changes are merged to the `main` branch.

## Option 1: Native Vercel Integration (Recommended)

This is the **easiest and most reliable** method. Vercel will automatically deploy whenever you push to your production branch.

### Setup Steps

1. **Connect Repository to Vercel**
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select your GitHub repository: `neaGaze/LunarBirthdayScheduler`
   - Authorize Vercel to access your GitHub repository

2. **Configure Project Settings**
   - **Framework Preset**: Other (or leave as detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (auto-detected from `vercel.json`)
   - **Output Directory**: `dist-web` (auto-detected from `vercel.json`)
   - **Install Command**: `npm install` (auto-detected from `vercel.json`)

3. **Set Environment Variables** (Important!)
   Add these environment variables in Vercel dashboard under "Settings > Environment Variables":

   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

   ⚠️ **Without these, the app won't work!**

4. **Configure Production Branch**
   - Go to "Settings > Git"
   - Set **Production Branch**: `main`
   - This tells Vercel which branch triggers production deployments

5. **Deploy**
   - Click "Deploy" to trigger your first deployment
   - Future pushes to `main` will automatically deploy

### How It Works

Once connected:
- ✅ **Push to `main`** → Automatic production deployment
- ✅ **Open PR** → Automatic preview deployment (with unique URL)
- ✅ **Push to PR** → Automatic preview update
- ✅ **Merge PR** → Automatic production deployment

### Deployment Status

You can check deployment status:
- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub PR**: Vercel bot will comment with preview URLs
- **GitHub Commits**: Vercel status checks will show pass/fail

---

## Option 2: GitHub Actions (Advanced)

If you need more control or want to run tests before deployment, use GitHub Actions.

### Prerequisites

1. Get your Vercel token and project info:
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login
   vercel login

   # Link project (run in project directory)
   vercel link

   # Get token from https://vercel.com/account/tokens
   ```

2. Add GitHub Secrets:
   - Go to: Repository Settings > Secrets and variables > Actions
   - Add these secrets:
     - `VERCEL_TOKEN`: Your Vercel token
     - `VERCEL_ORG_ID`: Found in `.vercel/project.json`
     - `VERCEL_PROJECT_ID`: Found in `.vercel/project.json`

3. The GitHub Actions workflow is already configured in `.github/workflows/vercel-deploy.yml`

### How It Works

The workflow triggers on:
- Push to `main` branch → Production deployment
- Pull requests → Preview deployment

---

## Verification

After setup, verify auto-deployment is working:

1. **Make a test change**:
   ```bash
   git checkout -b test-deployment
   echo "<!-- Test deployment -->" >> README.md
   git add README.md
   git commit -m "Test auto-deployment"
   git push -u origin test-deployment
   ```

2. **Create a Pull Request** on GitHub

3. **Check for Vercel bot comment**:
   - Should see a comment with preview URL
   - Example: "✅ Preview deployed to https://your-app-xyz.vercel.app"

4. **Merge the PR**

5. **Verify production deployment**:
   - Check Vercel dashboard for new production deployment
   - Visit your production URL

---

## Troubleshooting

### Deployment Fails

**Check build logs**:
- Vercel Dashboard > Deployments > Click failed deployment > View logs

**Common issues**:
1. **Missing environment variables** → Add in Vercel dashboard
2. **Build command fails** → Check `package.json` scripts
3. **Output directory wrong** → Verify `vercel.json` settings

### No Auto-Deployment

**Verify**:
1. Repository is connected in Vercel dashboard
2. Production branch is set to `main`
3. GitHub app has repository access

**Fix**:
- Disconnect and reconnect repository in Vercel
- Check GitHub > Settings > Applications > Vercel has access

### Preview Deployments Not Working

**Enable in Vercel**:
- Settings > Git > Enable "Automatic Preview Deployments"
- Ensure "Deploy Previews" is ON

---

## Current Configuration

Your project is already configured with:

✅ **vercel.json** - Build and routing configuration
✅ **package.json** - Build scripts (v1.1.0)
✅ **GitHub Actions** - Optional deployment workflow

### Build Settings (from vercel.json)

```json
{
  "framework": null,
  "buildCommand": "npm run build",
  "outputDirectory": "dist-web",
  "installCommand": "npm install"
}
```

### SPA Routing

All routes redirect to `/index.html` for React Router support.

---

## Next Steps

1. ✅ Connect repository to Vercel (Option 1)
2. ✅ Add environment variables
3. ✅ Deploy and verify
4. 🎉 Enjoy automatic deployments!

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Deployment Issues**: Check Vercel dashboard logs
- **GitHub Integration**: https://vercel.com/docs/git/vercel-for-github
