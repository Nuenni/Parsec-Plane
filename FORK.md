# Parsec

Parsec ist ein Fork von [Plane](https://github.com/makeplane/plane),
lizenziert unter AGPL-3.0-only.

Modifiziert seit August 2026 durch nafdo. Wesentliche Änderungen:

- Rebranding von "Plane" auf "Parsec" über Web-, Admin- und Space-App sowie
  transaktionale E-Mails
- GitHub-Integration von Grund auf neu gebaut: bidirektionaler Issue-/
  Kommentar-/Label-Sync, PR-Status-Verknüpfung, Sync der GitHub Issue Fields
  (Priority, Effort), Auth über eine eigene GitHub App statt Personal Access
  Token
- E-Mail-Support-Postfach: eingehende Anfragen per IMAP-Polling, Antworten
  per SMTP
- Frontend für bereits im Backend vorhandene Page-Verschachtelung und
  Page-Labels ergänzt; Kommentar-Threading (Antworten) im Frontend ergänzt
- Deployment-Anpassungen für Coolify + Traefik als Self-Hosting-Umgebung
- Diverse Bugfixes (u. a. S3-Storage, Page-Nesting-API, Avatar-Icons in
  Benachrichtigungs-Mails)

Der vollständige Quellcode der laufenden Instanz liegt in diesem Repository.

"Plane" ist eine Marke von Plane Software, Inc. Dieses Projekt steht in
keiner Verbindung zu Plane Software, Inc. und wird von dort nicht
unterstützt. Name und Logo "Parsec" sind nicht Teil der AGPL-Lizenzierung.
