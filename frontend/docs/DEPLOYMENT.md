# Deployment Guide

This document covers deploying the ASATECH frontend to production.

## Prerequisites

- Node.js 18+ installed
- Backend API deployed and accessible
- Paystack account with public key
- Domain name (optional but recommended)

## Build Process

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with production values:
```bash
VITE_API_BASE_URL=https://api.asatech.ng
VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxxxxxx
VITE_APP_MODE=production
VITE_APP_NAME=ASATECH
```

### 3. Build
```bash
npm run build
```

Output: `dist/index.html` (single file ~750KB, gzipped ~217KB)

### 4. Preview (Optional)
```bash
npm run preview
```

## Hosting Options

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Configure Environment Variables**
   In Vercel dashboard:
   - `VITE_API_BASE_URL`
   - `VITE_PAYSTACK_PUBLIC_KEY`
   - `VITE_APP_MODE=production`

4. **Custom Domain** (optional)
   - Add domain in Vercel dashboard
   - Update DNS records as instructed

### Option 2: Netlify

1. **Connect Repository**
   - Link GitHub/GitLab repository
   - Or drag-and-drop `dist/` folder

2. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Environment Variables**
   In Netlify dashboard → Site settings → Environment variables:
   - `VITE_API_BASE_URL`
   - `VITE_PAYSTACK_PUBLIC_KEY`
   - `VITE_APP_MODE=production`

4. **Custom Domain** (optional)
   - Add domain in Domain settings
   - Configure DNS

### Option 3: Cloudflare Pages

1. **Connect Repository**
   - Import from GitHub

2. **Build Settings**
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`

3. **Environment Variables**
   In Cloudflare dashboard → Pages → Settings → Environment variables:
   - `VITE_API_BASE_URL`
   - `VITE_PAYSTACK_PUBLIC_KEY`
   - `VITE_APP_MODE=production`

### Option 4: Static Hosting (S3 + CloudFront)

1. **Build**
   ```bash
   npm run build
   ```

2. **Upload to S3**
   ```bash
   aws s3 sync dist/ s3://asatech-frontend --delete
   ```

3. **Configure CloudFront**
   - Origin: S3 bucket
   - Viewer protocol: HTTPS only
   - Error pages: `/index.html` for 404 (SPA routing)

4. **Custom Domain**
   - Add CNAME in CloudFront
   - SSL certificate via ACM

### Option 5: Traditional Web Server

1. **Upload `dist/` contents** to web server root

2. **Configure server for SPA routing:**

   **Nginx:**
   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```

   **Apache (.htaccess):**
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

## Environment-Specific Builds

### Development
```bash
VITE_API_BASE_URL=http://localhost:8080
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxx
VITE_APP_MODE=development
```

### Staging
```bash
VITE_API_BASE_URL=https://staging-api.asatech.ng
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxx
VITE_APP_MODE=staging
```

### Production
```bash
VITE_API_BASE_URL=https://api.asatech.ng
VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxx
VITE_APP_MODE=production
```

## Post-Deployment Checklist

- [ ] Homepage loads correctly
- [ ] Product catalog displays
- [ ] Product details page works
- [ ] Add to cart functions
- [ ] Checkout requires login
- [ ] Login/registration works
- [ ] Paystack popup opens (test mode)
- [ ] Admin console accessible (admin login)
- [ ] Dark/light mode toggle works
- [ ] Mobile responsive layouts verified
- [ ] 404 page displays for invalid routes
- [ ] Console has no errors

## Monitoring

### Error Tracking
Consider integrating:
- Sentry
- LogRocket
- Bugsnag

### Analytics
- Google Analytics
- Plausible (privacy-focused)

### Performance
- Lighthouse scores
- Web Vitals monitoring
- CDN cache hit rates

## Rollback Strategy

### Vercel/Netlify
- Previous deployments retained
- One-click rollback in dashboard

### Manual
```bash
# Keep previous dist backup
cp -r dist dist-backup-$(date +%Y%m%d)

# Rollback
rm -rf dist
cp -r dist-backup-YYYYMMDD dist
aws s3 sync dist/ s3://asatech-frontend --delete
```

## Security Considerations

### HTTPS
- **Required** for payment processing
- Use Let's Encrypt or hosting provider SSL
- Redirect HTTP → HTTPS

### CORS
Backend must allow frontend origin:
```
Access-Control-Allow-Origin: https://asatech.ng
```

### Content Security Policy (Optional)
Add to `index.html`:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://js.paystack.co; 
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
               font-src https://fonts.gstatic.com; 
               img-src 'self' data: https:;">
```

### Rate Limiting
Configure on backend:
- Auth endpoints: 10 req/min
- Product listing: 100 req/min
- Payment init: 20 req/min

## CDN Configuration

### Cache Headers
```
Cache-Control: public, max-age=31536000, immutable
```

For `index.html`:
```
Cache-Control: no-cache, no-store, must-revalidate
```

### Compression
- Enable gzip/brotli
- Expected compression: ~70% reduction

## Custom Domain Setup

### DNS Records
```
Type    Name    Value
A       @       <hosting-ip>
CNAME   www     <hosting-domain>
```

### SSL Certificate
- Auto-provisioned by most hosting platforms
- Or upload custom certificate

## Maintenance

### Regular Updates
```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Rebuild and deploy
npm run build
```

### Breaking Changes
- Test in staging first
- Review changelogs
- Update environment variables if needed

## Troubleshooting

### Build Fails
```bash
# Clear cache
rm -rf node_modules/.vite
npm install
npm run build
```

### Runtime Errors
- Check browser console
- Verify environment variables
- Check backend API availability
- Review CORS configuration

### Paystack Not Loading
- Verify public key is correct (test vs live)
- Check script loading in Network tab
- Ensure HTTPS (Paystack requires secure context)

### 404 on Refresh
- Server not configured for SPA routing
- Add `try_files` directive (Nginx) or `.htaccess` rules (Apache)

## Support

For deployment issues:
1. Check this documentation
2. Review hosting platform docs
3. Check backend API status
4. Contact hosting support
