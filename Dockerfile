FROM node:16

MAINTAINER keith.dh@hotmail.com

EXPOSE 7001

WORKDIR /home/node/app

COPY ./ /home/node/app/

RUN npm config set registry https://registry.npmmirror.com
RUN npm install --production

CMD npm start
