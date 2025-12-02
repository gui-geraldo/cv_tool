FROM nginx:alpine

# Remove config padrão
RUN rm /etc/nginx/conf.d/default.conf

# Copia nossa config personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia o HTML do Admin
COPY public /usr/share/nginx/html