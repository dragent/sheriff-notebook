FROM php:8.4-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl git unzip libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-install pdo_pgsql

RUN a2enmod rewrite headers

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY docker/000-default.conf /etc/apache2/sites-available/000-default.conf

ARG APP_ENV=dev
ENV APP_ENV=${APP_ENV}

COPY composer.json composer.lock symfony.lock ./
RUN if [ "$APP_ENV" = "prod" ]; then \
        composer install --no-interaction --prefer-dist --no-scripts --no-dev --optimize-autoloader; \
    else \
        composer install --no-interaction --prefer-dist --no-scripts; \
    fi

COPY . .

# Symfony Runtime requires a readable .env file. backend/.env is gitignored and absent in CI / VPS clones.
# If no .env was copied (clean build), bootstrap from the committed example; Docker env_file still overrides at runtime.
RUN if [ ! -f .env ]; then cp .env.example .env; fi
