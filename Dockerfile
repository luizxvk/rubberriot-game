# Servidor multiplayer do Rubber Riot (Fly: rubber-riot-mp). So o server.js e o shared/.
FROM node:22-alpine
WORKDIR /app
RUN echo '{"type":"module","private":true,"dependencies":{"ws":"8.18.0"}}' > package.json && npm install --omit=dev --no-audit --no-fund
COPY server.js ./
COPY shared ./shared
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
