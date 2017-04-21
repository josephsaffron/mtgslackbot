FROM node:slim

RUN apt-get update && \
apt-get install -y git-core && \
mkdir /usr/mtgslackbot

WORKDIR /usr/mtgslackbot

COPY . /usr/mtgslackbot

RUN npm install

CMD [ "npm", "start" ]
