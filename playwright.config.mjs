import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',fullyParallel:false,workers:1,retries:process.env.CI?1:0,
 reporter:'list',use:{baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure',
 launchOptions:{...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox']}},
 webServer:{command:'node scripts/browser-server.cjs',url:'http://127.0.0.1:4173',reuseExistingServer:false,timeout:30000},
});
