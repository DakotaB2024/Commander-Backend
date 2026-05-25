import os
from discord.ext import commands

intents = discord.Intents.default()
intents.members = True

bot = commands.Bot(intents=intents, command_prefix='.')

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user.name} - {bot.user.id}')

@bot.command(name='hello', help='Responds with hello')
async def hello(ctx):
    await ctx.send('Hello!')

bot.run(os.getenv('BOT_TOKEN'))
