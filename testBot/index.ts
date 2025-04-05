import { Client, GatewayIntentBits } from 'discord.js';
import { BotBuilder } from '../src';
import { CreateInteractionEvent, CreateMessageEvent } from '../src/events';
import { getEnv } from './utils';



const pingCommand = new CreateInteractionEvent()
    .command(builder =>
        builder.setName('ping').setDescription('Replies with Pong!'))
    .on(async interaction => {
        await interaction.reply('🏓 Pong!');
    });

const messageLogger = new CreateMessageEvent().on(message => {
    if (!message.author.bot) {
        console.log(`📨 Message from ${message.author.username}: ${message.content}`);
    }
});

const getIntents = (keys: (keyof typeof GatewayIntentBits)[]): number[] => {
    return keys.map(k => GatewayIntentBits[k]);
};

new BotBuilder({
    client: new Client({ intents: getIntents(["Guilds"]) }),
    token: getEnv('TOKEN'),
    clientId: getEnv('CLIENT_ID'),
    guildId: getEnv('GUILD_ID')
})
    .use(pingCommand)
    .use(messageLogger)
    .login();