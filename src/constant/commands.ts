const commands = [
    {
        name: "ping",
        description: "Ping the bot",
    },
    {
        name: "pong",
        description: "Ping the bot",
    },
    {
        name: "pang",
        description: "Ping the bot",
    },
] as const;

// Dynamically generate the mapping:
const commandKey = commands.reduce((acc, command) => {
    acc[command.name.toUpperCase() as Uppercase<typeof command.name>] = command.name;
    return acc;
}, {} as Record<Uppercase<typeof commands[number]["name"]>, typeof commands[number]["name"]>);


export { commands, commandKey };