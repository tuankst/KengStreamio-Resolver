// Story 10-13 | RoPhim10 | Filter Phim Lẻ — v3
// Contract: filterMovies(sortIdx, sortVal, countryId, countryIdx, countryVal, yearId, yearIdx, yearVal, genreId, genreIdx, genreVal, page = 1) -> JSON array
// URL: /tim-kiem?countries={ID}&genres={ID}&years={YYYY}&type=movie&rating=&sort={sort}&page={N} on the active provider origin
//
// NOTE: No combined filter API available on the active provider origin (all /movies filter endpoints require auth).
// Uses HTML search page (/tim-kiem) — same approach as v1.
//
// Filter values (verified 2026-04-27, Story 11-9 fix):
// Countries: see COUNTRY_IDS below — ordered 1..45 per rophim10 backend
// Genres: see GENRE_IDS below — ordered per rophim10 backend IDs
// Sort: updatedAt (default), view_total, imdb_rating
// Page size: 32 items/page

async function filterMovies(baseUrl, 
    sortIdx,   sortVal,
    countryId, countryIdx, countryVal,
    yearId,    yearIdx,    yearVal,
    genreId,   genreIdx,   genreVal,
    page
) {
    page = page || 1;
    const SITE_BASE = baseUrl;
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

    function buildFetchOptions(refererUrl) {
        return {
            headers: {
                'User-Agent': UA,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Referer': refererUrl || SITE_BASE + '/',
                'Origin': SITE_BASE,
            },
        };
    }

    // Sort: index → API param
    const SORT_VALUES = ['updatedAt', 'view_total', 'imdb_rating'];  // 0=Mới Cập Nhật, 1=Xem Nhiều, 2=Đánh Giá Cao

    // Countries: index → API ID (Story 11-9 fix — 45 countries per rophim10 backend)
    // Index 0=Trung Quốc, 1=Âu Mỹ, 2=Hàn Quốc, 3=Indonesia, 4=Philippines, 5=Nga, 6=Singapore,
    // 7=Nhật Bản, 8=Thái Lan, 9=Anh, 10=Pháp, 11=Bỉ, 12=Hồng Kông, 13=Canada, 14=Úc, 15=Ý,
    // 16=Tây Ban Nha, 17=Ấn Độ, 18=Na Uy, 19=Đức, 20=Việt Nam, 21=Thổ Nhĩ Kỳ, 22=Argentina,
    // 23=Hà Lan, 24=Quốc Gia Khác, 25=Hy Lạp, 26=Brazil, 27=Đài Loan, 28=Mexico, 29=Nam Phi,
    // 30=Colombia, 31=Chile, 32=Ba Lan, 33=Đan Mạch, 34=Thụy Điển, 35=Ukraina, 36=Bồ Đào Nha,
    // 37=Malaysia, 38=Châu Phi, 39=Thụy Sĩ, 40=Ả Rập Xê Út, 41=Ireland, 42=Phần Lan, 43=UAE, 44=Nigeria
    const COUNTRY_IDS = [
      '1','2','3','4','5','6','7','8','9','10','11','12','13','14','15',
      '16','17','18','19','20','21','22','23','24','25','26','27','28','29','30',
      '31','32','33','34','35','36','37','38','39','40','41','42','43','44','45'
    ];

    // Genres: index → live category API ID (verified 2026-04-27)
    // Index 0=Chính kịch(1), 1=Hài Hước(2), 2=Bí ẩn(3), 3=Gia Đình(4), 4=Viễn Tưởng(6),
    // 5=Hình Sự(7), 6=Kinh Dị(8), 7=Phiêu Lưu(9), 8=Khoa Học(10), 9=Cổ Trang(11),
    // 10=Võ Thuật(12), 11=Tình Cảm(14), 12=Tâm Lý(16), 13=Âm Nhạc(18), 14=Thể Thao(19),
    // 15=Chiến Tranh(20), 16=Thần Thoại(21), 17=Học Đường(22), 18=Hoạt hình(24), 19=Hành Động(46)
    const GENRE_IDS = [
      '1','2','3','4','6','7','8','9','10','11','12','14','16','18','19','20','21','22','24','46'
    ];

    async function fetchHtml(url) {
        const res = await fetch(url, buildFetchOptions(SITE_BASE + '/'));
        if (!res.ok) throw new Error('Fetch failed ' + res.status + ': ' + url);
        return res.text();
    }

    function extractBadgeFromEmbeddedJson(html, slug) {
        const slugNeedle = '\\"slug\\":\\"' + slug + '\\"';
        let idx = html.indexOf(slugNeedle);
        if (idx === -1) {
            const rawNeedle = '"slug":"' + slug + '"';
            idx = html.indexOf(rawNeedle);
            if (idx === -1) return '';
        }

        const window = html.slice(idx, idx + 6000);
        const badgeMatch = window.match(/\\"episode_current\\":\\"([^\\"]+)\\"/);
        if (badgeMatch) return badgeMatch[1].trim();

        const qualityMatch = window.match(/\\"quality\\":\\"([^\\"]+)\\"/);
        if (qualityMatch) return qualityMatch[1].trim();

        return '';
    }

    function buildUrl() {
        const params = [];

        if (countryIdx !== '-1') {
            const idx = parseInt(countryIdx);
            const id = (idx >= 0 && idx < COUNTRY_IDS.length) ? COUNTRY_IDS[idx] : '';
            params.push('countries=' + id);
        } else {
            params.push('countries=');
        }

        if (genreIdx !== '-1') {
            const idx = parseInt(genreIdx);
            const id = (idx >= 0 && idx < GENRE_IDS.length) ? GENRE_IDS[idx] : '';
            params.push('genres=' + id);
        } else {
            params.push('genres=');
        }

        if (yearIdx !== '-1' && yearVal) {
            params.push('years=' + yearVal);
        } else {
            params.push('years=');
        }

        params.push('type=movie');
        params.push('rating=');

        let sortValue = 'updatedAt';
        if (sortIdx !== '-1') {
            const idx = parseInt(sortIdx);
            sortValue = (idx >= 0 && idx < SORT_VALUES.length) ? SORT_VALUES[idx] : 'updatedAt';
        }
        params.push('sort=' + sortValue);
        params.push('page=' + page);

        return SITE_BASE + '/tim-kiem?' + params.join('&');
    }

    try {
        console.log('[KENG][RoPhim10] filterMovies: page ' + page);
        const url = buildUrl();
        const html = await fetchHtml(url);

        // Collect data from multiple <a> tags with same href
        const movieData = {};  // href -> {poster, title, badge, slug}
        const itemRe = /<a[^>]+href="([^"]*\/phim\/([^"/?]+))"[^>]*>([\s\S]*?)<\/a>/gi;
        let m;

        while ((m = itemRe.exec(html)) !== null) {
            const link = m[1].startsWith('http') ? m[1] : SITE_BASE + m[1];
            const fullMatch = m[0];  // Full <a>...</a> including opening tag
            const content = m[3];    // Content inside <a>
            const slug = m[2];

            // Filter out trailers
            if (link.includes('.trailer') || 
                fullMatch.toLowerCase().includes('tag-trailer') || 
                content.toLowerCase().includes('trailer')) {
                continue;
            }

            if (!movieData[link]) {
                movieData[link] = { slug: slug, poster: '', title: '', badge: '' };
            }

            // Try extract image (from thumbnail <a>)
            const imgM = content.match(/src="([^"]+)"/) || content.match(/data-src="([^"]+)"/) || content.match(/data-original="([^"]+)"/);
            if (imgM) {
                let poster = imgM[1].startsWith('//') ? 'https:' + imgM[1] : imgM[1];
                if (poster.includes('loading') || poster.includes('base64') || poster.includes('.gif')) {
                    const fallbackImg = content.match(/data-src="([^"]+)"/) || content.match(/data-original="([^"]+)"/);
                    if (fallbackImg) poster = fallbackImg[1].startsWith('//') ? 'https:' + fallbackImg[1] : fallbackImg[1];
                }
                movieData[link].poster = poster;
            }

            // Try extract title with Vietnamese accents (from title <a>)
            // Use first title found (Vietnamese comes before English in HTML)
            const titleM = fullMatch.match(/<a[^>]+title="([^"]+)"/i);
            if (titleM && !movieData[link].title) {
                movieData[link].title = titleM[1].trim();
            }

            function resolveBadgePrefix(html) {
                const m = html.match(/\b(line-lt|line-tm|line-pd)\b/i);
                if (!m) return '';
                switch (m[1].toLowerCase()) {
                    case 'line-lt': return 'LT.';
                    case 'line-tm': return 'TM.';
                    case 'line-pd': return 'PĐ.';
                    default: return '';
                }
            }

            // Extract badge (from thumbnail <a>)
            const badgeM = content.match(/class="[^"]*(?:tag-classic|pin-new|badge|label|status|quality)[^"]*">([\s\S]*?)</i);
            if (badgeM && !movieData[link].badge) {
                const badgeBody = badgeM[1].replace(/<[^>]+>/g, '').trim();
                const badgePrefix = resolveBadgePrefix(badgeM[1]);
                movieData[link].badge = badgePrefix && badgeBody
                    ? `${badgePrefix} ${badgeBody}`
                    : badgeBody;
            }

            if (!movieData[link].badge) {
                const embeddedBadge = extractBadgeFromEmbeddedJson(html, slug);
                if (embeddedBadge) {
                    movieData[link].badge = embeddedBadge;
                }
            }
        }

        // Build final array from collected data
        const movies = [];
        for (const [link, data] of Object.entries(movieData)) {
            if (data.poster) {  // Only include items with poster
                const title = data.title || data.slug.replace(/-/g, ' ');  // Fallback to slug if no title
                movies.push({
                    rank:            0,
                    title:           title,
                    title_original:  '',
                    poster_url:      data.poster,
                    url:             link,
                    media_type:      'movie',
                    badge_text:      data.badge,
                    badge_sub:       '',
                    year:            '',
                    rating:          '',
                    synopsis:        '',
                    age_rating:      '',
                    episode_current: '',
                    genres:          []
                });

                if (movies.length >= 60) break;  // Limit to 60 items
            }
        }

        const finalResults = movies.map((i, idx) => ({
            rank:            (page - 1) * 60 + idx + 1,
            title:           i.title || 'No Title',
            title_original:  i.title_original || '',
            poster_url:      i.poster_url || '',
            url:             i.url || '',
            media_type:      'movie',
            badge_text:      i.badge_text || '',
            badge_sub:       i.badge_sub || '',
            year:            i.year || '',
            rating:          i.rating || '',
            synopsis:        i.synopsis || '',
            age_rating:      i.age_rating || '',
            episode_current: '',
            genres:          i.genres || []
        }));

        console.log('[KENG][RoPhim10] filterMovies SUCCESS: ' + finalResults.length + ' items (page ' + page + ')');
        return JSON.stringify(finalResults);

    } catch (e) {
        console.log('[KENG][RoPhim10] filterMovies error: ' + e.message);
        return JSON.stringify([]);
    }
}
