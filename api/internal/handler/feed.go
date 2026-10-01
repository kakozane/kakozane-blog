package handler

import (
	"encoding/xml"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/service"
)

type FeedHandler struct{ service *service.FeedService }

func NewFeedHandler(feedService *service.FeedService) *FeedHandler {
	return &FeedHandler{service: feedService}
}

func (h *FeedHandler) Sitemap(c *gin.Context) {
	site, posts, err := h.service.Data(c.Request.Context(), 0)
	if err != nil {
		contentError(c, err)
		return
	}
	type page struct {
		Loc     string `xml:"loc"`
		LastMod string `xml:"lastmod,omitempty"`
	}
	result := struct {
		XMLName xml.Name `xml:"urlset"`
		Xmlns   string   `xml:"xmlns,attr"`
		Pages   []page   `xml:"url"`
	}{Xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9"}
	for _, path := range []string{"/", "/archive", "/about"} {
		result.Pages = append(result.Pages, page{Loc: site.SiteURL + path})
	}
	for _, post := range posts {
		result.Pages = append(result.Pages, page{Loc: site.SiteURL + "/posts/" + url.PathEscape(post.Slug), LastMod: post.UpdatedAt.UTC().Format("2006-01-02")})
	}
	writeXML(c, result)
}

func (h *FeedHandler) RSS(c *gin.Context) {
	site, posts, err := h.service.Data(c.Request.Context(), 20)
	if err != nil {
		contentError(c, err)
		return
	}
	type item struct {
		Title       string `xml:"title"`
		Link        string `xml:"link"`
		Guid        string `xml:"guid"`
		Description string `xml:"description"`
		PubDate     string `xml:"pubDate"`
	}
	result := struct {
		XMLName xml.Name `xml:"rss"`
		Version string   `xml:"version,attr"`
		Channel struct {
			Title       string `xml:"title"`
			Link        string `xml:"link"`
			Description string `xml:"description"`
			Items       []item `xml:"item"`
		} `xml:"channel"`
	}{Version: "2.0"}
	result.Channel.Title = site.Title
	result.Channel.Link = site.SiteURL
	result.Channel.Description = site.Description
	for _, post := range posts {
		link := site.SiteURL + "/posts/" + url.PathEscape(post.Slug)
		result.Channel.Items = append(result.Channel.Items, item{Title: post.Title, Link: link, Guid: link, Description: post.Excerpt, PubDate: post.PublishedAt.Format(time.RFC1123Z)})
	}
	writeXML(c, result)
}

func (h *FeedHandler) Robots(c *gin.Context) {
	site, err := h.service.Site(c.Request.Context())
	if err != nil {
		contentError(c, err)
		return
	}
	c.Data(http.StatusOK, "text/plain; charset=utf-8", []byte(fmt.Sprintf("User-agent: *\nAllow: /\nSitemap: %s/sitemap.xml\n", site.SiteURL)))
}

func writeXML(c *gin.Context, data any) {
	body, err := xml.MarshalIndent(data, "", "  ")
	if err != nil {
		contentError(c, err)
		return
	}
	c.Data(http.StatusOK, "application/xml; charset=utf-8", append([]byte(xml.Header), body...))
}
