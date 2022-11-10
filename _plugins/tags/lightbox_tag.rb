# Syntax {% lightbox src ["alt"] %}
#
# Example:
# {% lightbox https://i.imgur.com/fsyrScY.jpg "test alt" %}

module Jekyll
    class LightboxTag < Liquid::Tag
      @src = nil
      @alt = ''
  
      def initialize(tag_name, markup, tokens)
        if markup =~ /\"(.*?)\" \"(.*?)\"/i
          @src = $1
          @alt = $2
        end
        if markup =~ /\"(.*?)\"/i
          @src = $1
        end
        super
      end
  
      def render(context)
        ouptut = super
        if @src
          img = %Q{<a data-fslightbox="gallery" data-alt="#{@alt}" href="#{@src}"><img src="#{@src}" alt="#{@alt}"></a>}
          %Q{<div class="lightbox-wrapper">#{img}<small>#{@alt}</small></div>}
        else
          "Error processing input, expected syntax: {% lightbox src ['alt'] %}"
        end
      end
    end
  end
  
  Liquid::Template.register_tag('lightbox', Jekyll::LightboxTag)
