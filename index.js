// Globalna zaštita da se bot nikad ne sruši
process.on('unhandledRejection', error => {
    console.error('Neočekivana greška (Promise):', error);
});
process.on('uncaughtException', error => {
    console.error('Neočekivana greška (Exception):', error);
});

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');
const config = require('./config.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Definirane sve role prema tvojim ID-evima
const ROLES = {
  specAdmin: '1566603604779995288',
  admin: '1565736703568908442',
  superAdmin: '1566603773046951956',
  ultraAdmin: '1566603885823660092',
  headStaff: '1566603884577824839',
  vodjaLidera: '1565844483973587045',
  vodjaStaffa: '1565736703568908441',
  carDev: '1566577627848904815',
  devTeam: '1566576834366279774',
  coOwner: '1565845602200322270',
  owner: '1565736703568908443'
};

// Svi viši rangovi od HeadStaffa (uključujući HeadStaff) za žalbe
const ZALBE_ROLES = [
  ROLES.headStaff,
  ROLES.ultraAdmin,
  ROLES.superAdmin,
  ROLES.specAdmin,
  ROLES.admin,
  ROLES.coOwner,
  ROLES.owner
];

// Lider prijave: Vođa lidera, Vođa staffa, Co-owner i Owner (maknuti spec, admin, super, ultra, head)
const LIDER_ROLES = [
  ROLES.vodjaLidera,
  ROLES.vodjaStaffa,
  ROLES.coOwner,
  ROLES.owner
];

// Sve žive role za opća pitanja
const SVE_ROLE = Object.values(ROLES);

// Kategorije i točno definirane role koje se tagiraju za svaki tiket
const TICKET_CATEGORIES = {
  ticket_donacije: {
    name: 'donacije',
    categoryId: '1572649785473900626',
    roles: [ROLES.owner, ROLES.coOwner]
  },
  ticket_pitanja: {
    name: 'pitanja',
    categoryId: '1572649830554009690',
    roles: SVE_ROLE
  },
  ticket_staff: {
    name: 'staff-prijave',
    categoryId: '1572649872086147132',
    roles: [ROLES.vodjaStaffa, ROLES.coOwner, ROLES.owner]
  },
  ticket_lider: {
    name: 'lider-prijave',
    categoryId: '1572650068216119356',
    roles: LIDER_ROLES
  },
  ticket_zalbe: {
    name: 'zalbe',
    categoryId: '1572649992571719690',
    roles: ZALBE_ROLES
  }
};

// Funkcija za provjeru je li korisnik staff
function isUserStaff(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return Object.values(ROLES).some(roleId => member.roles.cache.has(roleId));
}

client.once('clientReady', () => {
  console.log(`Bot je online kao ${client.user.tag} - Spreman!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // 1. Komanda !panel
  if (message.content === '!panel') {
    const embed = new EmbedBuilder()
      .setTitle('🎫 Old School - Centar za Podršku')
      .setDescription('Odaberi kategoriju tiketa iz padajućeg izbornika ispod ovisno o tome što ti treba.')
      .setColor(0x2b2d31);

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('ticket_menu')
        .setPlaceholder('Odaberi vrstu tiketa...')
        .addOptions([
          {
            label: 'Donacije',
            description: 'Pitanja i uplate vezane za donacije i shop',
            value: 'ticket_donacije',
            emoji: '💳'
          },
          {
            label: 'Pitanja',
            description: 'Opća pitanja i pomoć oko servera',
            value: 'ticket_pitanja',
            emoji: '❓'
          },
          {
            label: 'Prijava za staff',
            description: 'Prijavi se za poziciju staffa / moderatora',
            value: 'ticket_staff',
            emoji: '🛡️'
          },
          {
            label: 'Lider prijave',
            description: 'Prijava za lidera organizacije ili frakcije',
            value: 'ticket_lider',
            emoji: '👑'
          },
          {
            label: 'Žalbe',
            description: 'Žalbe na igrače ili staff članove',
            value: 'ticket_zalbe',
            emoji: '⚖️'
          }
        ])
    );

    await message.channel.send({ embeds: [embed], components: [row] }).catch(() => {});
    return;
  }

  const isTicketChannel = message.channel.name && message.channel.name.startsWith('ticket-');
  const userIsStaff = isUserStaff(message.member);

  // AUTOMATSKO DODAVANJE BEZ KOMANDE
  if (isTicketChannel && userIsStaff && !message.content.startsWith('!izbaci')) {
    const mentionedMember = message.mentions.members.first();
    if (mentionedMember && !mentionedMember.user.bot && !isUserStaff(mentionedMember)) {
      try {
        await message.channel.permissionOverwrites.edit(mentionedMember.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
        await message.react('✅').catch(() => {});
      } catch (error) {
        console.error('Greška pri automatskom dodavanju tagiranog korisnika:', error);
      }
    }
  }

  // 2. Komanda !izbaci @korisnik
  if (message.content.startsWith('!izbaci')) {
    if (!isTicketChannel) return;
    if (!userIsStaff) {
      return message.reply({ content: 'Samo ovlašteni članovi tima mogu izbacivati korisnike iz tiketa.' }).catch(() => {});
    }

    const targetMember = message.mentions.members.first();
    if (!targetMember) {
      return message.reply({ content: 'Molimo te označi korisnika kojeg želiš izbaciti, npr. `!izbaci @korisnik`' }).catch(() => {});
    }

    try {
      await message.channel.permissionOverwrites.edit(targetMember.id, {
        ViewChannel: false,
        SendMessages: false,
        ReadMessageHistory: false
      });

      await message.channel.send(`🚫 Korisnik ${targetMember} je u potpunosti izbačen iz ovog tiketa i više ga ne može vidjeti niti pisati.`);
    } catch (error) {
      console.error('Greška pri izbacivanju korisnika iz tiketa:', error);
      await message.reply({ content: 'Došlo je do greške pri izbacivanju korisnika.' }).catch(() => {});
    }
    return;
  }

  // 3. Komanda !close
  if (message.content === '!close') {
    if (!isTicketChannel) return;
    if (!userIsStaff) {
      return message.reply({ content: 'Samo ovlašteni članovi tima mogu koristiti ovu komandu za zatvaranje tiketa.' }).catch(() => {});
    }

    try {
      await message.channel.send('🔒 **Tiket se zatvara i kanal se briše za 3 sekunde...**');
      setTimeout(async () => {
        if (message.channel && message.channel.deletable) {
          await message.channel.delete().catch(() => {});
        }
      }, 3000);
    } catch (error) {
      console.error('Greška pri zatvaranju tiketa s !close:', error);
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_menu') {
    try {
      await interaction.deferReply({ flags: 64 });

      const guild = interaction.guild || client.guilds.cache.get(config.guildId);
      const user = interaction.user;
      const selectedValue = interaction.values[0];
      const ticketData = TICKET_CATEGORIES[selectedValue];

      if (!ticketData) {
        return interaction.editReply({ content: 'Nepoznata opcija tiketa.' });
      }

      const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '') || 'korisnik';
      const channelName = `ticket-${ticketData.name}-${cleanUsername}`;

      const existingChannel = guild.channels.cache.find((c) => c.name === channelName);
      if (existingChannel) {
        return interaction.editReply({
          content: `Već imaš otvoren tiket ove vrste: ${existingChannel}`
        });
      }

      const permissionOverwrites = [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory
          ]
        }
      ];

      // Daj dopuštenje svim rolama koje pripadaju ovom tipu tiketa
      for (const roleId of ticketData.roles) {
        if (roleId) {
          permissionOverwrites.push({
            id: roleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          });
        }
      }

      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: ticketData.categoryId,
        permissionOverwrites: permissionOverwrites
      });

      let ticketEmbed;
      if (selectedValue === 'ticket_staff') {
        ticketEmbed = new EmbedBuilder()
          .setTitle('🛡️ Prijava za Staff')
          .setDescription(`Pozdrav ${user}, odgovori nam na sljedeća pitanja kako bi dovršio prijavu:\n\n1. Koliko godina imate?\n2. Vaše roleplay iskustvo (1/10)?\n3. Zašto bi baš vas trebali izabrat?`)
          .setColor(0x57f287);
      } else {
        ticketEmbed = new EmbedBuilder()
          .setTitle(`Tiket: ${ticketData.name.toUpperCase()}`)
          .setDescription(`Pozdrav ${user}, hvala što si otvorio tiket. Opiši detaljno svoj problem i nadležni tim će ti se uskoro javiti.`)
          .setColor(0x57f287);
      }

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Zatvori Tiket')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

      const roleMentions = ticketData.roles.map((r) => `<@&${r}>`).join(' ');

      await ticketChannel.send({
        content: `${user} | ${roleMentions}`,
        embeds: [ticketEmbed],
        components: [closeRow]
      });

      await interaction.editReply({
        content: `Tvoj tiket je uspješno otvoren: ${ticketChannel}`
      });
    } catch (error) {
      console.error('Greška pri otvaranju tiketa:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: 'Došlo je do greške pri otvaranju tiketa.' }).catch(() => {});
      }
    }
  }

  // Zatvaranje tiketa putem gumba
  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    try {
      await interaction.reply({ content: '🔒 **Tiket se zatvara i kanal se briše za 3 sekunde...**' });
      setTimeout(async () => {
        if (interaction.channel && interaction.channel.deletable) {
          await interaction.channel.delete().catch(() => {});
        }
      }, 3000);
    } catch (error) {
      console.error('Greška pri zatvaranju tiketa putem gumba:', error);
    }
  }
});

client.login(config.token);