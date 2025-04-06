import { BotBuilder } from '../src';
import { CreateInteractionEvent, CreateMessageEvent } from '../src';

class Env {
    private readonly ENV_LIST = [
        "TOKEN",
        "CLIENT_ID",
        "GUILD_ID"
    ] as const;

    getEnv(key: typeof this.ENV_LIST[number]) {
        const env = process.env[key];
        if (!env) {
            throw new Error(`${key} is not set`);
        }
        return env;
    }

}

const getEnv = new Env().getEnv

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

new BotBuilder({
    token: getEnv('TOKEN'),
    clientId: getEnv('CLIENT_ID'),
    guildId: getEnv('GUILD_ID'),
})
    .use(pingCommand)
    .use(messageLogger)
    .login().then(r => console.log(r.toString()));