class Env {
    private readonly ENV_LIST = [
        "TOKEN",
        "CLIENT_ID",
    ] as const;

    public getEnv(key: typeof this.ENV_LIST[number]) {
        const env = process.env[key];
        if (!env) {
            throw new Error(`${key} is not set`);
        }
        return env;
    }

}

const getEnv = new Env().getEnv

export default getEnv;