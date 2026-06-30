import {
  BotBuilder,
  CommandBuilder,
  MemoryAdapter,
} from "@dookdiks/discord-bot-builder";

interface UserProfile {
  points: number;
  lastSeen: string;
}

class ProfileStore extends MemoryAdapter {
  private profileKey(userId: string): string {
    return `profile:${userId}`;
  }

  getProfile(userId: string): UserProfile {
    return (
      this.get<UserProfile>(this.profileKey(userId)) ?? {
        points: 0,
        lastSeen: new Date().toISOString(),
      }
    );
  }

  saveProfile(userId: string, profile: UserProfile): void {
    this.set(this.profileKey(userId), profile);
  }
}

const profile = new CommandBuilder("profile", "View your profile")
  .execute(async (ctx) => {
    const store = ctx.services.db as ProfileStore;
    const data = store.getProfile(ctx.user.id);
    data.lastSeen = new Date().toISOString();
    store.saveProfile(ctx.user.id, data);

    await ctx.reply({
      content: `**${ctx.user.username}**\nPoints: ${data.points}\nLast seen: ${data.lastSeen}`,
      ephemeral: true,
    });
  });

const addPoints = new CommandBuilder("addpoints", "Add points (admin)")
  .addIntegerOption("amount", "Points to add", { required: true, minValue: 1 })
  .addUserOption("user", "Target user", { required: false })
  .execute(async (ctx) => {
    const store = ctx.services.db as ProfileStore;
    const targetId = (ctx.options.user as { id: string } | undefined)?.id ?? ctx.user.id;
    const amount = ctx.options.amount as number;

    const data = store.getProfile(targetId);
    data.points += amount;
    store.saveProfile(targetId, data);

    await ctx.reply({
      content: `Added ${amount} points. <@${targetId}> now has ${data.points} points.`,
    });
  });

const db = new ProfileStore();

const bot = await BotBuilder.create()
  .token(process.env.DISCORD_TOKEN!)
  .clientId(process.env.CLIENT_ID!)
  .guildId(process.env.GUILD_ID)
  .database(db)
  .commands([profile, addPoints])
  .onReady(async (ctx) => console.log(`Ready: ${ctx.client.user?.tag}`))
  .build();

await bot.start();
