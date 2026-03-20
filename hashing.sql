USE market_db;

UPDATE employees SET password_hash = '$2b$12$qu97YgNCAN7kW3TtxU/MuO/zryGICSAhXB14fYYwleb8YZOYBiZCa' WHERE username = 'admin';

UPDATE employees SET password_hash = '$2b$12$qu97YgNCAN7kW3TtxU/MuO/zryGICSAhXB14fYYwleb8YZOYBiZCa' WHERE username = 'cashier1';

UPDATE employees SET password_hash = '$2b$12$qu97YgNCAN7kW3TtxU/MuO/zryGICSAhXB14fYYwleb8YZOYBiZCa' WHERE username = 'storekeeper1';
