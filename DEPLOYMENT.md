# Heroku Deployment Guide

This guide will help you deploy the Hael.r application to Heroku.

## Prerequisites

1. Heroku account (sign up at https://heroku.com)
2. Heroku CLI installed (https://devcenter.heroku.com/articles/heroku-cli)
3. MongoDB Atlas account (for production database) or Heroku MongoDB addon
4. OpenAI API key

## Step 1: Environment Variables

### Server Environment Variables

Set these in Heroku Config Vars (Settings → Config Vars):

```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mental-health-app
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
JWT_SECRET=your-strong-random-secret-here
CORS_ORIGIN=https://your-frontend-domain.com
```

### Frontend Environment Variables

For the frontend (if deploying separately or using buildpacks):

```bash
REACT_APP_API_URL=https://your-backend-app.herokuapp.com/api
```

## Step 2: Deploy Backend Server

1. Navigate to the project root:
```bash
cd server
```

2. Initialize Heroku git (if not already done):
```bash
heroku create your-app-name
```

3. Add MongoDB addon (optional, if not using MongoDB Atlas):
```bash
heroku addons:create mongolab:sandbox
```

4. Set environment variables:
```bash
heroku config:set NODE_ENV=production
heroku config:set OPENAI_API_KEY=sk-your-key
heroku config:set JWT_SECRET=your-secret
heroku config:set CORS_ORIGIN=https://your-frontend-domain.com
```

5. Deploy:
```bash
git push heroku main
```

## Step 3: Deploy Frontend (Optional)

The frontend can be deployed separately using:

### Option A: Vercel/Netlify (Recommended)
- Connect your GitHub repository
- Set build command: `npm run build`
- Set output directory: `dist`
- Add environment variable: `REACT_APP_API_URL=https://your-backend.herokuapp.com/api`

### Option B: Heroku Static Buildpack
```bash
heroku create your-frontend-app --buildpack https://github.com/heroku/heroku-buildpack-static
```

## Step 4: Database Setup

1. **MongoDB Atlas** (Recommended):
   - Create cluster at https://www.mongodb.com/cloud/atlas
   - Get connection string
   - Set `MONGODB_URI` in Heroku config vars
   - Whitelist Heroku IPs (0.0.0.0/0 for development)

2. **Heroku MongoDB Addon**:
   ```bash
   heroku addons:create mongolab:sandbox
   ```
   This automatically sets `MONGODB_URI`

## Step 5: Verify Deployment

1. Check server health:
```bash
curl https://your-app.herokuapp.com/health
```

2. Check logs:
```bash
heroku logs --tail
```

## Troubleshooting

### Build Fails
- Ensure `tsconfig.json` exists in server directory
- Check that all dependencies are in `dependencies`, not `devDependencies`
- Verify Node.js version compatibility

### MongoDB Connection Issues
- Verify `MONGODB_URI` is set correctly
- Check MongoDB Atlas IP whitelist
- Ensure connection string includes database name

### API Errors
- Check CORS settings match frontend URL
- Verify OpenAI API key is valid
- Check Heroku logs for detailed error messages

### Frontend Can't Connect to Backend
- Verify `REACT_APP_API_URL` is set correctly
- Check CORS configuration in server
- Ensure backend is running and accessible

## Production Checklist

- [ ] All environment variables set
- [ ] MongoDB database configured
- [ ] OpenAI API key configured
- [ ] CORS origin set to production frontend URL
- [ ] JWT secret is strong and unique
- [ ] Health check endpoint working
- [ ] Error logging configured
- [ ] Database indexes created (if needed)
- [ ] Frontend API URL points to production backend

## Scaling

To scale the application:
```bash
heroku ps:scale web=2
```

## Monitoring

Monitor your application:
```bash
heroku logs --tail
heroku ps
heroku pg:info  # If using Postgres
```

## Notes

- The Procfile runs the server from the `server` directory
- Heroku automatically runs `heroku-postbuild` script after install
- Build times may vary based on dependencies
- Free tier has sleep after 30 minutes of inactivity
- Consider upgrading for production use

