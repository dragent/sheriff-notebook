<?php

require dirname(__DIR__) . '/vendor/autoload.php';

// Force l'environnement test pour PHPUnit (notamment dans Docker où APP_ENV=dev peut venir du .env ou du compose).
putenv('APP_ENV=test');
$_ENV['APP_ENV'] = 'test';
$_SERVER['APP_ENV'] = 'test';

use Symfony\Component\Dotenv\Dotenv;

if (method_exists(Dotenv::class, 'bootEnv')) {
    (new Dotenv())->bootEnv(dirname(__DIR__) . '/.env');
}

if (isset($_SERVER['APP_DEBUG']) && $_SERVER['APP_DEBUG']) {
    umask(0000);
}
