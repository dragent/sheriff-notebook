# Nginx configuration for Sheriff's Office Annesburg (VPS)

- **sheriff.dragent.fr** → frontend (Next.js, port 3000)
- **api.sheriff.dragent.fr** → backend (Symfony, port 8080)
- **sheriffnotebook.dragent.fr** → frontend (Next.js, port 3000)
- **api.sheriffnotebook.dragent.fr** → backend (Symfony, port 8080)

Assumes Docker Compose prod is running and exposing `3000` (frontend) and `8080` (backend) on the host.

## 1. Install Nginx and Certbot (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

## 2. First-time: get SSL certificates

Create the webroot for ACME challenge and use the HTTP-only config so Certbot can validate:

```bash
sudo mkdir -p /var/www/certbot
# Copy the HTTP-only config
sudo cp docs/nginx/sheriff.dragent.fr.http-only.conf /etc/nginx/sites-available/sheriff.dragent.fr
sudo ln -sf /etc/nginx/sites-available/sheriff.dragent.fr /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx    
# Get certs (one cert for both names)
sudo certbot certonly --webroot -w /var/www/certbot -d sheriff.dragent.fr -d api.sheriff.dragent.fr
# Certbot creates /etc/letsencrypt/options-ssl-nginx.conf and ssl-dhparams.pem if missing:
sudo certbot install --cert-name sheriff.dragent.fr --nginx
# Or generate DH params manually if needed:
# sudo openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
```

## 3. Enable full config (HTTPS + redirect)

Replace the HTTP-only config with the full one:

```bash
sudo cp docs/nginx/sheriff.dragent.fr.conf /etc/nginx/sites-available/sheriff.dragent.fr
sudo nginx -t && sudo systemctl reload nginx
```

## 4. Renewal (Let's Encrypt)

Certbot installs a timer. Test renewal:

```bash
sudo certbot renew --dry-run
```

### sheriffnotebook.dragent.fr variant

`certbot certonly --webroot` may **not** create `/etc/letsencrypt/options-ssl-nginx.conf`. Copy `docs/nginx/letsencrypt-options-ssl-nginx.conf` there **before** the full HTTPS vhost (see `docs/VPS_INSTALL.md` §4.2).

```bash
sudo mkdir -p /var/www/certbot/.well-known/acme-challenge
sudo cp docs/nginx/sheriffnotebook.dragent.http-only.conf /etc/nginx/sites-available/sheriffnotebook.dragent
sudo ln -sf /etc/nginx/sites-available/sheriffnotebook.dragent /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot certonly --webroot -w /var/www/certbot -d sheriffnotebook.dragent.fr -d api.sheriffnotebook.dragent.fr
sudo mkdir -p /etc/letsencrypt
sudo cp docs/nginx/letsencrypt-options-ssl-nginx.conf /etc/letsencrypt/options-ssl-nginx.conf
sudo cp docs/nginx/sheriffnotebook.dragent.conf /etc/nginx/sites-available/sheriffnotebook.dragent
sudo nginx -t && sudo systemctl reload nginx
```

## 5. If you use only one domain (no api.sheriff.dragent.fr)

Comment out or remove the `server { ... server_name api.sheriff.dragent.fr; }` block in `sheriff.dragent.fr.conf`, and in the HTTP redirect block keep only `server_name sheriff.dragent.fr;`. The frontend proxies API calls to the backend internally; a separate API subdomain is optional.
