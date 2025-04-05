import { REST, Routes } from 'discord.js';
import { getEnv } from './utils';
import { commands } from './constant/commands';

const rest = new REST({ version: '10' }).setToken(getEnv("TOKEN"));

try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(getEnv("CLIENT_ID")), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
} catch (error) {
    console.error(error);
}